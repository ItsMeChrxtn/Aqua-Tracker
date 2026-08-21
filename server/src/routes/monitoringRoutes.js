const express = require('express');
const { protect } = require('../middleware/auth');
const cycleController = require('../controllers/cycleController');
const stocking = require('../controllers/stockingController');
const growth = require('../controllers/growthController');
const mortality = require('../controllers/mortalityController');
const feeding = require('../controllers/feedingController');
const sales = require('../controllers/salesController');
const harvest = require('../controllers/harvestController');

const router = express.Router();
router.use(protect);

// Production cycles (batches)
router.get('/fishponds/:fishpondId/cycles', cycleController.listCycles);
router.post('/fishponds/:fishpondId/cycles', cycleController.createCycle);
router.get('/cycles/:id', cycleController.getCycle);
router.put('/cycles/:id', cycleController.updateCycle);

// Per-cycle record creation + listing (single batch/species)
router.get('/cycles/:cycleId/stocking', stocking.listByCycle);
router.post('/cycles/:cycleId/stocking', stocking.create);
router.delete('/stocking/:id', stocking.remove);

router.get('/cycles/:cycleId/growth', growth.listByCycle);
router.post('/cycles/:cycleId/growth', growth.create);
router.delete('/growth/:id', growth.remove);

router.get('/cycles/:cycleId/mortality', mortality.listByCycle);
router.post('/cycles/:cycleId/mortality', mortality.create);
router.delete('/mortality/:id', mortality.remove);

router.get('/cycles/:cycleId/feeding', feeding.listByCycle);
router.post('/cycles/:cycleId/feeding', feeding.create);
router.delete('/feeding/:id', feeding.remove);

router.get('/cycles/:cycleId/sales', sales.listByCycle);
router.post('/cycles/:cycleId/sales', sales.create);
router.delete('/sales/:id', sales.remove);

// Fishpond-wide aggregate listing across ALL cycles (past + current batches),
// optionally filtered by ?speciesId= — powers the monitoring charts.
router.get('/fishponds/:fishpondId/stocking-records', stocking.listByFishpond);
router.get('/fishponds/:fishpondId/growth-records', growth.listByFishpond);
router.get('/fishponds/:fishpondId/mortality-records', mortality.listByFishpond);
router.get('/fishponds/:fishpondId/feeding-records', feeding.listByFishpond);
router.get('/fishponds/:fishpondId/sales-records', sales.listByFishpond);

// Harvest estimation
router.get('/cycles/:cycleId/harvest-estimate', harvest.getEstimate);
router.post('/cycles/:cycleId/harvest', harvest.logHarvest);
router.get('/fishponds/:fishpondId/harvest-history', harvest.getHistory);

module.exports = router;
