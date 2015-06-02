$(function () {
    var defaults = {
        // Ascent targets:
        ascentRateTarget: 4.5, // m/s
        ballastDropInSeconds: 0, // s

        // Flight system properties:
        envelopeMass: 300,      // g
        flightSystemMass: 1090, // flight system & payload, g
        ballastMass: 630,       // g
        balloonDrag: 0.25,
        neckTubeInletDiameter: 0.030, // m
        rSpecificLiftingGas: 2077, // J/kg K
        ballastReleaseRate: 5.25,  // g/s

        // Launch site conditions:
        lsPressure: 101000, // Pa
        lsTemperature: 283, // K
        lsBalloonDiffPressure: 133, // Pa
        lsBalloonGasTemperature: 283, // K

        // Target altitude conditions:  
        ambientPressure: 10343, // Pa
        ambientTemperature: 221, // K
        ambientBalloonDiffPressure: 150, // Pa
        ambientBalloonGasTemperature: 223 // K
    };

    for (var prop in defaults) {
        var val = defaults[prop];
        $('#' + prop).val(val);
    }
});