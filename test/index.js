var should = require('should');

var calculator = require('../calculator/js/main.js');

describe('Condition', function () {
    
    var unit = calculator.condition({
        pressure: 101000,
        temperature: 283,
        balloon: {
            diffPressure: 133,
            gasTemperature: 283
        }
    });

    it('should calculate neutral lift before 500ms timeout', function (done) {
        this.timeout(500);
        unit.calcHeliumMass({ mass: 2.02 }, 0.0);
        done();
    });
});

describe('System', function () {
    var system = calculator.system({
        systemMass: 2.02,
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
        (system.launch).should.be.above(0.44).and.below(0.45);
    });

    it('calculates correct neutral lift helium mass', function () {
        (system.neutral).should.be.above(0.324).and.below(0.325);
    });
        
    it('calculates correct vent time', function () {
        (system.time).should.be.above(63).and.below(64);        
    });
});