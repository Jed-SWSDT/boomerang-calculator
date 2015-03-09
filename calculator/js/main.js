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
        Gravity: 9.810        // m/s^2
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

        balloon.gasDensity = 
            balloon.gaugePressure / (balloon.gasTemperature * constants.RSpecificHe);

        var calcHeliumMass = function (vehicle, ascentRateTarget, accuracy) {
            var airDensity = pressure / (constants.RSpecificAir * temperature);

            var calculateAscentRate = function (heliumMass) {
                var pressureThing = 
                    balloon.gaugePressure / (constants.RSpecificHe * balloon.gasTemperature);

                var launchVolume = heliumMass / pressureThing;
                var launchRadius = Math.pow((3 * launchVolume) / (4 * Math.PI), 1/3);

                var grossLiftKg = launchVolume * (airDensity - balloon.gasDensity);
                var freeLiftKg = grossLiftKg - vehicle.mass;
                var freeLiftNewtons = freeLiftKg * constants.Gravity;

                if (freeLiftNewtons <= 0) {
                    // Descending ...
                    // TODO: Actually do the math? This isn't as important
                    // now that we use a narrowing-in algorithm.
                    return -10;
                }

                if (launchRadius <= 0.0) {
                    error("Helium mass cannot be zero, if you want a positive ascent rate.");
                }

                var ascentRate = 
                     Math.sqrt(freeLiftNewtons / 
                     (0.5 * constants.BalloonDrag * airDensity * (Math.PI * Math.pow(launchRadius,2))));

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

                return ascentRate;
            };

            var heliumMass = 0.0010;
            var massIsGreaterThan = 0.0;
            var massIsLessThan = undefined;

            var ascentRate = calculateAscentRate(heliumMass);

            while (Math.abs(ascentRate - ascentRateTarget) > (accuracy || 0.0001)) {
                
                if (ascentRate < ascentRateTarget) {
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

                ascentRate = calculateAscentRate(heliumMass);
            }

            return heliumMass;
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

        return {
            pressure: pressure,
            temperature: temperature,
            balloon: balloon,
            calcHeliumMass: calcHeliumMass,
            calcVentTime: calcVentTime
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
            mass: params.vehicle.mass || 2.0200, // kg
            // TODO: Where does the valve want to be?
            valve: {
                neckTubeInletDiameter: tubeDiameter,
                neckTubeInletRadius: tubeRadius,
                neckTubeInletArea: Math.PI * Math.pow(tubeRadius, 2)
            }
        };

        // Targets
        var ascentRateTarget = params.ascentRateTarget || 4.5; // m/s;

        // Conditions
        var launch = BalloonModel({
            site: params.launch, 
            balloon: params.launch.balloon
        });
        var target = BalloonModel({
            site: params.target, 
            balloon: params.target.balloon
        });

        //----------------------------------------------
        // Calculations
        //
        var launchHeliumMass = launch.calcHeliumMass(vehicle, ascentRateTarget);        
        // Calculate the neutral lift using the launch-site conditions, 
        // because they're easier to verify(?)
        var neutralLiftHeliumMass = launch.calcHeliumMass(vehicle, 0.0);

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
            launch: launchHeliumMass,
            neutral: neutralLiftHeliumMass,
            time: ventTimeForStableFloat
        };
    };

    return {
        BalloonViewModel: BalloonViewModel,
        test: {
            system: BalloonViewModel,
            condition: BalloonModel
        }
    }
}();

if (typeof(window) === 'undefined' && module) {
    module.exports = SAW.test;
}
