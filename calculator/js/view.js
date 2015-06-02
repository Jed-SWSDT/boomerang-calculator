var updateView = function () {

    var totalMass = (parseFloat($("#envelopeMass").val()) +
        parseFloat($("#flightSystemMass").val()) +
        parseFloat($("#ballastMass").val())) / 1000; // kg

    var rSpecificLiftingGas = parseFloat($("#rSpecificLiftingGas").val());
    if (rSpecificLiftingGas <= 0) {
        rSpecificLiftingGas = 2077; // For Helium
        $("#rSpecificLiftingGas").val(2077);
    }

    var params = {
        vehicle: {
            mass: {
                balloonEnvelope: parseFloat($("#envelopeMass").val()),
                flightSystem: parseFloat($("#flightSystemMass").val()),
                ballast: parseFloat($("#ballastMass").val())
            },
            balloonDrag: parseFloat($("#balloonDrag").val()),
            rSpecificLiftingGas: rSpecificLiftingGas,
            ballastReleaseRate: parseFloat($("#ballastReleaseRate").val()),
            valve: {
                neckTubeInletDiameter: parseFloat($("#neckTubeInletDiameter").val())
            }
        },
        launch: {
            pressure: parseFloat($("#lsPressure").val()),
            temperature: parseFloat($("#lsTemperature").val()),
            balloon: {
                diffPressure: parseFloat($("#lsBalloonDiffPressure").val()),
                gasTemperature: parseFloat($("#lsBalloonGasTemperature").val()),
            }
        },
        ascentRateTarget: parseFloat($("#ascentRateTarget").val()),
        target: {
            pressure: parseFloat($("#ambientPressure").val()),
            temperature: parseFloat($("#ambientTemperature").val()),
            balloon: {
                diffPressure: parseFloat($("#ambientBalloonDiffPressure").val()),
                gasTemperature: parseFloat($("#ambientBalloonGasTemperature").val())
            }
        }
    };

    var calc = SAW.BalloonViewModel(params);

    $("#ascent").text(calc.launch.gasMass.toFixed(3));
    $("#neutral").text(calc.neutral.gasMass.toFixed(3));
    $("#time").text(calc.time.toFixed(0));
    
    var dropTime = parseFloat($("#ballastDropInSeconds").val());
    
    $("#ballastRemaining").text(calc.launch.ballastAfterBallastDrop(dropTime).toFixed(0));
    $("#postBallastDropAscentRate").text(calc.launch.ascentRateAfterBallastDrop(dropTime).toFixed(1));
    $("#settlingAboveTarget").text(calc.neutral.ambientPressureAfterBallastDrop(dropTime).toFixed(0));

    $("#launchVolume").text(calc.launch.launchVolume.toFixed(3));
    $("#freeLiftKg").text(calc.launch.freeLiftKg.toFixed(4));
    // This is no longer needed. Leave here for a little in case we change
    // our minds. May 28, 2015.
    // $("#ballastDurationCapacity").text(calc.launch.ballastDurationCapacity.toFixed(4));

    $("#totalMass").text(totalMass);
    
    $("#lsAirDensity").text(calc.launch.airDensity.toFixed(4));
    $("#ambientAirDensity").text(calc.neutral.airDensity.toFixed(4));
    
};

$(function () {
    var fieldsToUpdateOnChange = [ 
        'envelopeMass',
        'flightSystemMass',
        'ballastMass', 
        
        'neckTubeInletDiameter',
        'balloonDrag',
        'rSpecificLiftingGas',
        'ballastReleaseRate',
        
        'lsPressure',
        'lsTemperature',
        'lsBalloonDiffPressure',
        'lsBalloonGasTemperature',
        
        'ascentRateTarget',
        'ballastDropInSeconds',
        
        'ambientPressure',
        'ambientTemperature',
        'ambientBalloonDiffPressure',
        'ambientBalloonGasTemperature'];

    for (var index in fieldsToUpdateOnChange) {
        $("#" + fieldsToUpdateOnChange[index]).change(updateView);
    }

    $("#calcButton").click(updateView);

    updateView();
});