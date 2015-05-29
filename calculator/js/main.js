// Balloon calculator
var SAW = function () {
    var debug = false;

    var constants = {
        BalloonDrag: 0.25,            // coefficient
        ValveTubeInletDiameter: 0.03, // m

        HeliumDensity: 0.1786, // ... at 20C, 101 kPa (kg/m^3)
        AirDensity: 1.2930,    // ... at 20C, 101 kPa (kg/m^3)
        RSpecificHe: 2077,     // J/Kg K
        RSpecificAir: 286.9,   // J/Kg K
        Gravity: 9.810         // m/s^2
    };

    var error = function (message) {
        var err = new Error(message);
        throw err;
    };

    var verifyBalloonModelParams = function (params) {
        if (!params || !params.site) {
            error("Please specify an initial state");
        }

        var site = params.site;
        if (!site.temperature || site.temperature <= 0.0) {
            error("Site temperature must be greater than 0 kelvin");
        }
        if (!site.pressure || site.pressure <= 0.0) {
            error("Site pressure must be greater than 0");
        }

        if (!params.balloon) {
            error("Please specify an initial balloon state");
        }

        var balloon = params.balloon;
        if (!balloon.gasTemperature || balloon.gasTemperature <= 0.0) {
            error("Balloon gas temperature must be greater than 0 kelvin");
        }

        // Needed in the vent-time calc
        if (!balloon.diffPressure || balloon.diffPressure <= 0.0) {
            error("Balloon diff pressure must be greater than 0");
        }
        
        if (!params.vehicle) {
            error("Please specify an initial vehicle state");
        }
        
        var vehicle = params.vehicle;
        if (!vehicle.ballastReleaseRate || vehicle.ballastReleaseRate <= 0.0) {
            error("Ballast release rate must be greater than 0");
        }
    }

    // params: {
    //   site: { pressure, temperature },
    //   balloon: { diffPressure, gasTemperature }
    // }
    var BalloonModel = function (params) {
        verifyBalloonModelParams(params);

        var pressure = params.site.pressure || 101000; // Pa 
        var temperature = params.site.temperature || 283; // K
        
        var balloon = {
            diffPressure: params.balloon.diffPressure || 133, // Pa 
            gasTemperature: params.balloon.gasTemperature || 283 // K
        };
        
        // TODO: This is a system, so should we code it as such?
        // (In other words, do we need setters and to update the
        // model when any paramter changes?)
        balloon.gaugePressure = pressure + balloon.diffPressure;
        if (balloon.gaugePressure <= 0) {
            error("Balloon gauge pressure must be greater than zero");
        }

        var rSpecificLiftingGas = params.vehicle.rSpecificLiftingGas;
        if (!rSpecificLiftingGas || rSpecificLiftingGas <= 0)  {
            // TODO: Tell the user something is wrong.
            console.log("R Specific lifting gas is: " + rSpecificLiftingGas);
            console.log("... using helium as the lifting gas.")
            rSpecificLiftingGas = constants.RSpecificHe;
        }
        
        balloon.gasDensity = 
            balloon.gaugePressure / (balloon.gasTemperature * rSpecificLiftingGas);
            
        var airDensity = pressure / (constants.RSpecificAir * temperature);

        var calcBalloonState = function (vehicle, ascentRateTarget, accuracy) {


            var calculateState = function (heliumMass, vehicleMass) {
                var pressureThing = 
                    balloon.gaugePressure / (rSpecificLiftingGas * balloon.gasTemperature);

                var launchVolume = heliumMass / pressureThing;
                var launchRadius = Math.pow((3 * launchVolume) / (4 * Math.PI), 1/3);

                var grossLiftKg = launchVolume * (airDensity - balloon.gasDensity);
                var freeLiftKg = grossLiftKg - vehicleMass.totalKg;
                var freeLiftNewtons = freeLiftKg * constants.Gravity;
                
                var getFreeLiftNewtons = function (vehicleMassKg) {
                    var freeLiftKg = grossLiftKg - vehicleMassKg;
                    var freeLiftNewtons = freeLiftKg * constants.Gravity;
                    return freeLiftNewtons;
                };

                if (grossLiftKg <= 0) {
                    error("The balloon gas density is more dense than air. It is impossible to ascend.");    
                }
                
                if (freeLiftNewtons <= 0) {
                    // Descending ...
                    // TODO: Actually do the math? This isn't as important
                    // now that we use a narrowing-in algorithm.
                    return {
                        ascentRate: -10,
                        freeLiftKg: freeLiftKg,
                        launchVolume: launchVolume
                    };
                }

                if (launchRadius <= 0.0) {
                    error("Helium mass cannot be zero, if you want a positive ascent rate.");
                }

                var ascentRate = 
                     Math.sqrt(freeLiftNewtons / 
                     (0.5 * vehicle.balloonDrag * airDensity * (Math.PI * Math.pow(launchRadius,2))));

                var ascentRateAfterBallastDrop = function (ballastMassDropped) {
                    // Don't allow us to drop more ballast than we have.
                    var ballastMassAfterDrop = vehicleMass.ballast - ballastMassDropped;
                    ballastMassAfterDrop = Math.max(0, ballastMassAfterDrop);
                    
                    var actualMassDrop = vehicleMass.ballast - ballastMassAfterDrop;
                    var actualMassDropKg = actualMassDrop / 1000.0;
                    var massAfterBallastDropKg = vehicleMass.totalKg - actualMassDropKg;
                    
                    var freeLiftNewtons = getFreeLiftNewtons(massAfterBallastDropKg);
                    var newAscentRate = 
                        Math.sqrt(freeLiftNewtons / 
                        (0.5 * vehicle.balloonDrag * airDensity * (Math.PI * Math.pow(launchRadius,2))));
                        
                    return newAscentRate;
                };

                if (debug) {
                    console.log("\n");
                    console.log("Helium mass:        " + heliumMass);
                    console.log("Gauge pressure:     " + balloon.gaugePressure);
                    console.log("Air density:        " + airDensity);
                    console.log("Balloon gas dens:   " + balloon.gasDensity); 
                    console.log("Launch volume:      " + launchVolume); 
                    console.log("Gross lift (kg):    " + grossLiftKg);
                    console.log("Free lift (kg):   "   + freeLiftKg);
                    console.log("Free lift (N):    "   + freeLiftNewtons);
                    console.log("Ascent rate:      "   + ascentRate);    
                }

                return {
                    ascentRate: ascentRate,
                    freeLiftKg: freeLiftKg,
                    launchVolume: launchVolume,
                    ascentRateAfterBallastDrop: ascentRateAfterBallastDrop
                };
            };

            var heliumMass = 0.0010;
            var massIsGreaterThan = 0.0;
            var massIsLessThan = undefined;

            var state = calculateState(heliumMass, vehicle.mass);

            while (Math.abs(state.ascentRate - ascentRateTarget) > (accuracy || 0.0001)) {
                
                if (state.ascentRate < ascentRateTarget) {
                    // The target mass is greater than where we are at
                    massIsGreaterThan = heliumMass;
                }
                else {
                    // We've overshot our ascent target
                    massIsLessThan = heliumMass;
                }

                if (!massIsLessThan) {
                    // If we don't know our max yet,
                    // double the guess
                    heliumMass = heliumMass * 2;
                    // TODO: Do we need to worry about number overflow?
                }
                else {
                    // Otherwise guess halfway between things
                    heliumMass = (massIsGreaterThan + massIsLessThan) / 2;
                }

                state = calculateState(heliumMass, vehicle.mass);
            }

            return { 
                gasMass: heliumMass,
                launchVolume: state.launchVolume,
                freeLiftKg: state.freeLiftKg,
                state: state
            };
        };

        var calcVentTime = function (beforeMass, afterMass, valve) {
            if (!valve) {
                error("Please specify a valve");
            }
            if (!valve.neckTubeInletArea || valve.neckTubeInletArea <= 0) {
                error("Please specify a valve.neckTubeInletDiameter greater than 0");
            }

            var idealOutletVelocity = Math.sqrt((2 * balloon.diffPressure) / balloon.gasDensity); 
            var volumetricFlowRate = idealOutletVelocity * valve.neckTubeInletArea;
            var massFlowRate = volumetricFlowRate * balloon.gasDensity;
            var ventTime = (beforeMass - afterMass) / massFlowRate;

            return ventTime;
        };

        var vehicle = params.vehicle;

        var calcAmbientPressureAfterBallastDrop = function (dropTime) {
            var pressureFraction = balloon.diffPressure / pressure;
            var systemWeight = vehicle.mass.totalKg * constants.Gravity;

            var droppedBallastMass = dropTime * vehicle.ballastReleaseRate;
            droppedBallastMass = Math.min(vehicle.mass.ballast, droppedBallastMass);
            
            var massAfterBallastDrop = vehicle.mass.totalKg - (droppedBallastMass / 1000.0);
            var systemWeightAfterBallastDrop = massAfterBallastDrop * constants.Gravity;
            
            var ambientPressure = balloon.diffPressure / (((systemWeight * (1 + pressureFraction)) / systemWeightAfterBallastDrop) - 1);
            
            if (debug) {
                console.log("Pressure fraction: " + pressureFraction);
                console.log("System weight:     " + systemWeight);
                console.log("Mass after drop:   " + massAfterBallastDrop); 
            }
            
            return ambientPressure;
        };

        return {
            pressure: pressure,
            temperature: temperature,
            airDensity: airDensity,
            balloon: balloon,
            calcBalloonState: calcBalloonState,
            calcVentTime: calcVentTime,
            calcAmbientPressureAfterBallastDrop: calcAmbientPressureAfterBallastDrop,
            vehicle: {
                ballastDurationCapacity: function () {
                    return vehicle.mass.ballast / vehicle.ballastReleaseRate;
                }()
            }
        };
    };

    // Params:
    // vehicle: {
    //     mass: (number),
    //     valve: [Object]
    // },
    // launch: { 
    //     pressure: (number),
    //     temperature: (number),
    //     balloon: {
    //         diffPressure: (number),
    //         gasTemperature: (number)
    //     }
    // },
    // ascentRateTarget: (number),
    // target: {
    //     pressure: (number),
    //     temperature: (number),
    //     balloon: {
    //         diffPressure: (number),
    //         gasTemperature: (number)
    //     }
    // }
    var BalloonViewModel = function (params) {
        params = params || {};

        var tubeDiameter = params.vehicle.valve.neckTubeInletDiameter || constants.ValveTubeInletDiameter;
        var tubeRadius = tubeDiameter / 2;

        // Launch site loading
        var vehicle = {
            mass: params.vehicle.mass || {
                balloonEnvelope: 300,
                flightSystem: 1090,
                ballast: 630
            },
            balloonDrag: params.vehicle.balloonDrag || constants.BalloonDrag,
            rSpecificLiftingGas: params.vehicle.rSpecificLiftingGas || constants.RSpecificHe,
            ballastReleaseRate: params.vehicle.ballastReleaseRate || 2.5, // g/s
            // TODO: Where does the valve want to be?
            valve: {
                neckTubeInletDiameter: tubeDiameter,
                neckTubeInletRadius: tubeRadius,
                neckTubeInletArea: Math.PI * Math.pow(tubeRadius, 2)
            }
        };

        vehicle.mass.totalKg = function () {
            return (vehicle.mass.balloonEnvelope +
                vehicle.mass.flightSystem +
                vehicle.mass.ballast) / 1000.0;
        }();

        // Targets
        var ascentRateTarget = params.ascentRateTarget || 4.5; // m/s;

        // Conditions
        var launch = BalloonModel({
            site: params.launch, 
            balloon: params.launch.balloon,
            vehicle: vehicle
        });
        var target = BalloonModel({
            site: params.target, 
            balloon: params.target.balloon,
            vehicle: vehicle
        });

        //----------------------------------------------
        // Calculations
        //
        var balloonState = launch.calcBalloonState(vehicle, ascentRateTarget);
        var launchHeliumMass = balloonState.gasMass;
        
        // Calculate the neutral lift using the launch-site conditions, 
        // because they're easier to verify(?)
        var neutralLiftHeliumMass = launch.calcBalloonState(vehicle, 0.0).gasMass;

        if (debug) {
            console.log("\nLaunch helium mass: " + launchHeliumMass + " kg");
            console.log("Neutral lift helium mass: " + neutralLiftHeliumMass + " kg");    
        }
        
        var ventTimeForStableFloat = 
            target.calcVentTime(launchHeliumMass, neutralLiftHeliumMass, vehicle.valve);

        if (debug) {
            console.log("Vent time for stable float: " + ventTimeForStableFloat + " seconds");
        }

        return {
            launch: {
                gasMass: launchHeliumMass,
                airDensity: launch.airDensity,
                launchVolume: balloonState.launchVolume,
                freeLiftKg: balloonState.freeLiftKg,
                ballastDurationCapacity: launch.vehicle.ballastDurationCapacity,
                ascentRateAfterBallastDrop: function (dropTime) {
                    var ballastMass = dropTime * vehicle.ballastReleaseRate;
                    return balloonState.state.ascentRateAfterBallastDrop(ballastMass);
                },
                ballastAfterBallastDrop: function (dropTime) {
                    // Trivial. Do this here.
                    var droppedBallastMass = dropTime * vehicle.ballastReleaseRate;
                    return Math.max(0, vehicle.mass.ballast - droppedBallastMass);
                }
            },
            neutral: {
                gasMass: neutralLiftHeliumMass,
                airDensity: target.airDensity,
                ambientPressureAfterBallastDrop: target.calcAmbientPressureAfterBallastDrop
            },
            time: ventTimeForStableFloat
        };
    };

    return {
        BalloonViewModel: BalloonViewModel,
        test: {
            viewModel: BalloonViewModel,
            model: BalloonModel
        }
    }
}();

// for Node.js (unit testing)
if (typeof(window) === 'undefined' && module) {
    module.exports = SAW.test;
}
