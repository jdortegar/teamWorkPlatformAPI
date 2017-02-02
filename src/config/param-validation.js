var Joi = require('joi');

var preludeConfigItemsSchema = Joi.object()
  .keys({
    items: Joi.array().items(Joi.object()
      .keys({
        provider: Joi.string().required(),
        rate: Joi.number().required(),
        perUnit: Joi.string().required(),
        demandCharges: Joi.string().required(),
        notes: Joi.string().allow('')
      }))
  }).required();

var chillersScheme = Joi.array().items(Joi.object()
  .keys({
    name: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    tonnage: Joi.number().required(),
    numberPoints: Joi.string().required(),
    iplv: Joi.array().items(Joi.number()),
    photo: Joi.string()
  }));

var heatExchangersSchema = Joi.array().items(Joi.object()
  .keys({
    name: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    tonnage: Joi.number().required(),
    flowRate: Joi.number().required(),
    flowType: Joi.string().required(),
    photo: Joi.string()
  }));

// var plantEquipmentSchema1 = Joi.object()
//   .keys({
//     chillers: chillersScheme.when('heatExchangers', {
//       is: heatExchangersSchema.length(0),
//       then: chillersScheme.required().min(1)
//     }),
//     heatExchangers: heatExchangersSchema
//   })
//   .required();
//
// var plantEquipmentSchema2 = Joi.object()
//   .keys({
//     chillers: chillersScheme,
//     heatExchangers: heatExchangersSchema.when('chillers', {
//       is: chillersScheme.length(0),
//       then: heatExchangersSchema.required().min(1)
//     })
//   })
//   .required();

// var plantEquipmentSchema = Joi.alternatives(plantEquipmentSchema1, plantEquipmentSchema2);

var validationSchemas = {
  createUser: {
    body: {
      email: Joi.string().email().required(),
      username: Joi.string().required()
    }
  },
  updatePreludeConfig: {
    body: {
      name: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      gps: Joi.object()
        .keys({
          lat: Joi.number().required(),
          long: Joi.number().required()
        })
        .required(),
      utilityCosts: Joi.object()
        .keys({
          water: preludeConfigItemsSchema,
          power: preludeConfigItemsSchema,
          waterTreatment: preludeConfigItemsSchema
        })
        .required(),
      // plantEquipment: plantEquipmentSchema,
      waterTreatmentEquipment: Joi.object()
        .keys({
          waterTreatmentControllers: Joi.array().items(Joi.object()
            .keys({
              name: Joi.string().required(),
              manufacturer: Joi.string().required(),
              model: Joi.string().required(),
              modelNumber: Joi.string().required(),
              notes: Joi.string().allow('')
            })).required(),
          sensors: Joi.array().items(Joi.object()
            .keys({
              sensors: Joi.array().required(),
              sensorType: Joi.string().allow(''),
              makeupWaterMeter: Joi.array(),
              systemWaterMeter: Joi.array(),
              blowdownPurgeMeter: Joi.array()
            }))
        }),
      systems: Joi.object()
        .keys({
          bmsBas: Joi.array().items(Joi.object()
            .keys({
              manufacturer: Joi.string().required(),
              model: Joi.string().required(),
              newtworks: Joi.array()
            }))
        })
    }
  },
  updatePreludeFinished: {
    body: {
      finished: Joi.boolean().required()
    }
  },
  updateWaterTest: {
    body: {
      date: Joi.number().required(),
      performedBy: Joi.string().required(),
      pH: Joi.number().required(),
      conductivity: Joi.number().required(),
      pAlkalinity: Joi.number().required(),
      tAlkalinity: Joi.number().required(),
      chloride: Joi.number().required(),
      caHardness: Joi.number().required(),
      phosphonate: Joi.number().required()
    }
  },
  updateT24AnnualWaterTest: {
    body: {
      testDate: Joi.number().required(),
      makeupWaterConductivity: Joi.number().required()
    }
  },
  updateSiteVariables: {
    body: {
      variables: Joi.array().items(Joi.object()
        .keys({
          img: Joi.string().required(),
          description: Joi.string().required(),
          date: Joi.number().required(),
          equipment: Joi.array().required()
        })).required()
    }
  },
  monthlyWaterTestUpdate: {
    body: {
      date: Joi.number().required(),
      iron: Joi.number().required(),
      copper: Joi.number().required(),
      sulphate: Joi.number().required(),
      sulfite: Joi.number().required()
    }
  }
};

module.exports = validationSchemas;
