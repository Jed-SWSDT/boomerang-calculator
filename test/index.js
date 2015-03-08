var should = require('should');

var calculator = require('../calculator/js/main.js');

var unit = calculator({
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

describe('Calculator', function () {
    it('should return the right results', function () {
        (unit.launch).should.be.above(0.44).and.below(0.45);
        (unit.neutral).should.be.above(0.324).and.below(0.325);
        (unit.time).should.be.above(63).and.below(64);        
    })
})


