// Balloon calculator
var SAW = function () {
    var debug = true;

    var constants = {
        HeliumDensity: 0.1786, // ... at 20C, 101 kPa (kg/m^3)
        AirDensity: 1.2930,    // ... at 20C, 101 kPa (kg/m^3)
        RSpecificHe: 2077,     // J/Kg K
        RSpecificAir: 286.9,   // J/Kg K
        Gravity: 9.810,        // m/s^2
        BalloonDrag: 0.25      // ??
    };

    var getBalloonCondition = function (initialState) {
        var pressure = initialState.pressure || 101000; // Pa 
        var temperature = initialState.temperature || 283; // K
        
        var balloon = initialState.balloon || {
            diffPressure: 133, // Pa 
            gasTemperature: 283 // K    
        };

        // TODO: This is a system, so should we code it as such?
        // (In other words, do we need setters and to update the
        // model when any paramter changes?)
        balloon.gaugePressure = pressure + balloon.diffPressure;
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
    // systemMass: (number),
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
    var Balloon = function (params) {
        params = params || {};

        // Launch site loading
        var vehicle = {};
        vehicle.mass = params.systemMass || 2.0200; // kg

        // Targets
        var ascentRateTarget = params.ascentRateTarget || 4.5; // m/s;

        // Conditions
        var launch = getBalloonCondition(params.launch);
        var target = getBalloonCondition(params.target);

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

        // TODO: Where does the valve want to be?
        var valve = {};
        valve.neckTubeInletDiameter = 0.03; // m
        valve.neckTubeInletRadius = valve.neckTubeInletDiameter / 2;
        valve.neckTubeInletArea = Math.PI * Math.pow(valve.neckTubeInletRadius, 2);
        
        var ventTimeForStableFloat = 
            target.calcVentTime(launchHeliumMass, neutralLiftHeliumMass, valve);

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
        Balloon: Balloon,
        test: {
            system: Balloon,
            condition: getBalloonCondition
        }
    }
}();

if (module) {
    module.exports = SAW.test;
}
