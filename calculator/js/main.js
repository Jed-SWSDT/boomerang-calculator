// Balloon calculator

var constants = {
    HeliumDensity: 0.1786, // ... at 20C, 101 kPa (kg/m^3)
    AirDensity: 1.2930,    // ... at 20C, 101 kPa (kg/m^3)
    RSpecificHe: 2077,     // J/Kg K
    RSpecificAir: 286.9,   // J/Kg K
    Gravity: 9.810,        // m/s^2
    BalloonDrag: 0.25      // ??
};

// Launch site loading
var system = {};
system.mass = 2.0200; // kg


// Launch site values
var launchSite = {};

launchSite.pressure = 101000; // Pa
launchSite.temperature = 283; // K

var balloon = {};
balloon.diffPressure = 133; // Pa
balloon.gasTemperature = 283; // K

//
var ascentRateTarget = 4.5; // m/s;

//----------------------------------------------
// Calculations
//
launchSite.airDensity = 
    launchSite.pressure / (constants.RSpecificAir * launchSite.temperature);

balloon.gaugePressure = 
    launchSite.pressure + balloon.diffPressure;

balloon.gasDensity = 
    balloon.gaugePressure / (balloon.gasTemperature * constants.RSpecificHe);

launchSite.balloon = balloon;

var calcHeliumMass = function (ascentRateTarget, accuracy) {

    var calculateAscentRate = function (heliumMass) {
        var pressureThing = balloon.gaugePressure / (constants.RSpecificHe * balloon.gasTemperature);
        var launchVolume = heliumMass / pressureThing;
        var launchRadius = Math.pow((3 * launchVolume) / (4 * Math.PI), 1/3);

        var grossLiftKg = launchVolume * (launchSite.airDensity - balloon.gasDensity);
        var freeLiftKg = grossLiftKg - system.mass;
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
// The lowest ascent rate we can calculate right now is 0.12 m/s
var neutralLiftHeliumMass = calcHeliumMass(0.0, 0.12);

console.log("\nLaunch helium mass: " + launchHeliumMass);
console.log("Neutral lift helium mass: " + neutralLiftHeliumMass);

