var should = require('should');

var calculator = require('../calculator/js/main.js');

var defaultState = {
    vehicle: {
        mass: {
            balloonEnvelope: 300,
            flightSystem: 1090,
            ballast: 630   
        },
        neckTubeInletDiameter: 0.03,
        balloonDrag: 0.25,
        rSpecificLiftingGas: 2077,
        ballastReleaseRate: 2.5
    },
    site: {
        pressure: 101000,
        temperature: 283
    },
    balloon: {
        diffPressure: 133,
        gasTemperature: 283
    }
};

describe('Balloon Model', function () {
    var unit = calculator.model(defaultState);
    it('calculates neutral lift before 500ms timeout', function (done) {
        this.timeout(500);
        unit.calcBalloonState({ mass: defaultState.vehicle.mass }, 0.0);
        done();
    });

    it('throws an error when site temperature is zero', function () {
        var testState = defaultState;
        testState.site.temperature = 0;

        (function () {
            calculator.model(testState);
        }).should.throw();
    });

    it('throws an error when site pressure is zero', function () {
        var testState = defaultState;
        testState.site.pressure = 0;

        (function () {
            calculator.model(testState);
        }).should.throw();
    });


    it('throws an error when site pressure is too low', function () {
        var testState = defaultState;
        testState.site.pressure = 101;

        (function () {
            calculator.model(testState);
        }).should.throw();
    });


    it('throws an error when balloon diff pressure is zero', function () {
        var testState = defaultState;
        testState.balloon.diffPressure = 0;

        (function () {
            calculator.model(testState);
        }).should.throw();
    });

    it('throws an error when balloon gas temperature is zero', function () {
        var testState = defaultState;
        testState.balloon.gasTemperature = 0;

        (function () {
            calculator.model(testState);
        }).should.throw();
    });
});

describe('Balloon View Model', function () {
    var system = calculator.viewModel({
        vehicle: {
            mass: {
                balloonEnvelope: 300,
                flightSystem: 1090,
                ballast: 630
            },
            valve: {
                neckTubeInletDiameter: 0.03
            }
        },
        launch: {
            pressure: 101000,
            temperature: 283,
            balloon: {
                diffPressure: 133,
                gasTemperature: 283
            }
        },
        ascentRateTarget: 4.5,
        target: {
            pressure: 10343,
            temperature: 221,
            balloon: {
                diffPressure: 150,
                gasTemperature: 223
            }
        }
    });

    it('calculates correct launch helium mass', function () {
        (system.launch.gasMass).should.be.above(0.44).and.below(0.45);
    });

    it('calculates correct neutral lift helium mass', function () {
        (system.neutral.gasMass).should.be.above(0.324).and.below(0.325);
    });
        
    it('calculates correct vent time', function () {
        (system.time).should.be.above(63).and.below(64);        
    });
});