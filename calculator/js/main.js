// Balloon calculator
Balloon = function (params) {
    var args = params || {};

    var constants = {
        HeliumDensity: 0.1786, // ... at 20C, 101 kPa (kg/m^3)
        AirDensity: 1.2930,    // ... at 20C, 101 kPa (kg/m^3)
        RSpecificHe: 2077,     // J/Kg K
        RSpecificAir: 286.9,   // J/Kg K
        Gravity: 9.810,        // m/s^2
        BalloonDrag: 0.25      // ??
    };

    // Launch site loading
    var systemMass = args.systemMass || 2.0200; // kg

    // Launch site values
    var launchSite = {};

    launchSite.pressure = params.launchSite.pressure || 101000; // Pa
    launchSite.temperature = params.launchSite.temperature || 283; // K

    var balloon = {};
    balloon.diffPressure = params.launchSite.balloon.diffPressure || 133; // Pa
    balloon.gasTemperature = params.launchSite.balloon.gasTemperature || 283; // K

    //
    var ascentRateTarget = params.ascentRateTarget || 4.5; // m/s;

    // Target environment
    var target; 
    if (!params.target) {
        target = {};
        target.pressure = 10343; // Pa
        target.temperature = 221; // K

        target.balloon = {};
        target.balloon.diffPressure = 150; // Pa
        target.balloon.gasTemperature = 223; // K
    }
    else {
        target = params.target;
    }

    //----------------------------------------------
    // Calculations
    //

    // Launch site ...
    launchSite.airDensity = 
        launchSite.pressure / (constants.RSpecificAir * launchSite.temperature);

    balloon.gaugePressure = 
        launchSite.pressure + balloon.diffPressure;

    balloon.gasDensity = 
        balloon.gaugePressure / (balloon.gasTemperature * constants.RSpecificHe);

    launchSite.balloon = balloon;

    // In the sky ...
    target.airDensity =
        target.pressure / (constants.RSpecificAir * target.temperature);

    target.balloon.gaugePressure = target.pressure + target.balloon.diffPressure;
    target.balloon.gasDensity = 
        target.balloon.gaugePressure / (target.balloon.gasTemperature * constants.RSpecificHe);


    var calcHeliumMass = function (ascentRateTarget, accuracy) {

        var calculateAscentRate = function (heliumMass) {
            var pressureThing = balloon.gaugePressure / (constants.RSpecificHe * balloon.gasTemperature);
            var launchVolume = heliumMass / pressureThing;
            var launchRadius = Math.pow((3 * launchVolume) / (4 * Math.PI), 1/3);

            var grossLiftKg = launchVolume * (launchSite.airDensity - balloon.gasDensity);
            var freeLiftKg = grossLiftKg - systemMass;
            var freeLiftNewtons = freeLiftKg * constants.Gravity;

            if (freeLiftNewtons <= 0) {
                // Descending ...
                // TODO: Actually do the math.
                return -10;
            }

            var ascentRate = 
                 Math.sqrt(freeLiftNewtons / 
                 (0.5 * constants.BalloonDrag * launchSite.airDensity * (Math.PI * Math.pow(launchRadius,2))));

            console.log("\n");
            console.log("Helium mass:      " + heliumMass);
            console.log("Gauge pressure:   " + balloon.gaugePressure);
            console.log("Air density:      " + launchSite.airDensity); 
            console.log("Balloon gas dens: " + balloon.gasDensity); 
            console.log("Launch volume:    " + launchVolume); 
            console.log("Gross lift (kg):  " + grossLiftKg);
            console.log("Free lift (kg):   " + freeLiftKg);
            console.log("Free lift (N):    " + freeLiftNewtons);
            console.log("Ascent rate:      " + ascentRate);

            return ascentRate;
        };

        var heliumMass = 0.0;
        var ascentRate = calculateAscentRate(heliumMass);

        while (Math.abs(ascentRate - ascentRateTarget) > (accuracy || 0.001)) {
            if (ascentRate < ascentRateTarget) {
                // Increase mass by hundredths, to arrive
                // in the ballpack relatively quickly, and
                // minimize floating-point arithmetic.
                heliumMass += 0.0010;
            }
            else {
                // When we get here, we've overshot our 
                // ascent target, so we decrease by
                // thousandths, to get a more
                // accurate result.
                heliumMass -= 0.0001;
            }

            ascentRate = calculateAscentRate(heliumMass);
        }

        return heliumMass;
    };

    var launchHeliumMass = calcHeliumMass(ascentRateTarget);
    // The lowest ascent rate we can calculate right now is 0.15 m/s
    var neutralLiftHeliumMass = calcHeliumMass(0.0, 0.15);

    console.log("\nLaunch helium mass: " + launchHeliumMass + " kg");
    console.log("Neutral lift helium mass: " + neutralLiftHeliumMass + " kg");

    var valve = {};
    valve.neckTubeInletDiameter = 0.03; // m
    valve.neckTubeInletRadius = valve.neckTubeInletDiameter / 2;
    valve.neckTubeInletArea = Math.PI * Math.pow(valve.neckTubeInletRadius, 2);

    var idealOutletVelocity = Math.sqrt((2 * target.balloon.diffPressure) / target.balloon.gasDensity); 
    var volumetricFlowRate = idealOutletVelocity * valve.neckTubeInletArea;
    var massFlowRate = volumetricFlowRate * target.balloon.gasDensity;
    var ventTimeForStableFloat = (launchHeliumMass - neutralLiftHeliumMass) / massFlowRate;

    console.log("Vent time for stable float: " + ventTimeForStableFloat + " seconds");

    return {
        launch: launchHeliumMass,
        neutral: neutralLiftHeliumMass,
        time: ventTimeForStableFloat
    };
};

