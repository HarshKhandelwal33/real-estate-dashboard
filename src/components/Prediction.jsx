import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Grid, Card, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// ---------------
// Model logic (simulated; keep as-is)
// ---------------
class RentPredictor {
  constructor() {
    this.isTrained = false;
    this.data = [];
    this.featureImpacts = { balcony: 0, garden: 0, lift: 0 };
    this.regionMultipliers = {};
    this.coeffs = {
      base: 800,
      livingSpace: 8.2,
      rooms: 120,
      balcony: 212,
      garden: 65,
      lift: 332
    };
  }

  cleanRegionName(name) {
    if (!name) return 'Unknown';
    return name
      .replace(/_/g, ' ')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ãœ/g, 'Ü')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ã¤/g, 'ä')
      .replace(/Ã„/g, 'Ä')
      .replace(/ÃŸ/g, 'ß');
  }

  train(data) {
    if (!Array.isArray(data) || data.length === 0) return;
    this.data = data;

    const allRegions = data
      .map(row => this.cleanRegionName(row.regio1))
      .filter(Boolean);
    const uniqueRegions = [...new Set(allRegions)];
    uniqueRegions.forEach(region => {
      const regionRows = data.filter(
        r => this.cleanRegionName(r.regio1) === region
      );
      const avg = regionRows.reduce((sum, r) => sum + (r.totalRent || 0), 0) / regionRows.length;
      this.regionMultipliers[region] = avg > 0 ? avg / 1200 : 1.0; // Just scale
    });

    this.featureImpacts = this.calculateModelFeatureImpacts();
    this.isTrained = true;
  }

  predict(row) {
    let pred = this.coeffs.base +
      this.coeffs.livingSpace * (parseFloat(row.livingSpace) || 0) +
      this.coeffs.rooms * (parseFloat(row.rooms) || 0);

    if (row.balcony === true || row.balcony === 'true' || row.balcony === 'yes') pred += this.coeffs.balcony;
    if (row.garden === true || row.garden === 'true' || row.garden === 'yes') pred += this.coeffs.garden;
    if (row.lift === true || row.lift === 'true' || row.lift === 'yes') pred += this.coeffs.lift;

    const region = this.cleanRegionName(row.regio1) || this.cleanRegionName(row.region) || 'Berlin';
    pred *= this.regionMultipliers[region] || 1.0;

    return Math.round(pred);
  }

  getSixPredictions(livingSpace, rooms, region) {
    const baseInputs = {
      livingSpace,
      rooms,
      regio1: region
    };
    return [
      {
        name: 'All true',
        rent: this.predict({ ...baseInputs, balcony: true, garden: true, lift: true }),
        hasFeature: true, featureType: 'allTrue'
      },
      {
        name: 'All false',
        rent: this.predict({ ...baseInputs, balcony: false, garden: false, lift: false }),
        hasFeature: true, featureType: 'allFalse'
      },
      {
        name: 'Balcony',
        rent: this.predict({ ...baseInputs, balcony: true, garden: false, lift: false }),
        hasFeature: true, featureType: 'balcony'
      },
      {
        name: 'No Balcony',
        rent: this.predict({ ...baseInputs, balcony: false, garden: true, lift: true }),
        hasFeature: false, featureType: 'balcony'
      },
      {
        name: 'Garden',
        rent: this.predict({ ...baseInputs, balcony: false, garden: true, lift: false }),
        hasFeature: true, featureType: 'garden'
      },
      {
        name: 'No Garden',
        rent: this.predict({ ...baseInputs, balcony: true, garden: false, lift: true }),
        hasFeature: false, featureType: 'garden'
      },
      {
        name: 'Lift',
        rent: this.predict({ ...baseInputs, balcony: false, garden: false, lift: true }),
        hasFeature: true, featureType: 'lift'
      },
      {
        name: 'No Lift',
        rent: this.predict({ ...baseInputs, balcony: true, garden: true, lift: false }),
        hasFeature: false, featureType: 'lift'
      },
    ];
  }

  calculateModelFeatureImpacts() {
    const impacts = {};
    ['balcony', 'garden', 'lift'].forEach(feature => {
      const rows = this.data.filter(row => row.livingSpace && row.rooms);
      const diffs = rows.map(row => {
        const testRow = { ...row };
        const rowYes = { ...testRow, [feature]: true };
        const rowNo = { ...testRow, [feature]: false };
        return this.predict(rowYes) - this.predict(rowNo);
      });
      impacts[feature] = diffs.length ? (diffs.reduce((s, v) => s + v, 0) / diffs.length) : 0;
    });
    return impacts;
  }

  getFeatureImpacts() {
    const res = {};
    for (let k of ['balcony', 'garden', 'lift']) {
      res[k] = Math.round(this.featureImpacts[k]);
    }
    return res;
  }
}

// ---------------
// The Prediction Component
// ---------------
const PredictionTab = ({ data = [] }) => {
  const [livingSpace, setLivingSpace] = useState(80);
  const [rooms, setRooms] = useState(3);
  const [region, setRegion] = useState('');
  const [regions, setRegions] = useState([]);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [featureImpacts, setFeatureImpacts] = useState({ balcony: 0, garden: 0, lift: 0 });

  const [predictor] = useState(() => new RentPredictor());

  const cleanRegionName = (name) => predictor.cleanRegionName(name);
  const availableRegions = useMemo(() => (
    Array.isArray(data) ? (
      [...new Set(data
        .map(row => cleanRegionName(row.regio1))
      )].filter(Boolean).sort()
    ) : []
  ), [data]);

  // Train once
  useEffect(() => {
    if (!isModelTrained && data && data.length > 0) {
      predictor.train(data);
      setIsModelTrained(true);
      setFeatureImpacts(predictor.getFeatureImpacts());
      setRegions(availableRegions);
      if (!region && availableRegions.length) setRegion(availableRegions[0]);
    }
    // eslint-disable-next-line
  }, [data, predictor, isModelTrained, region, availableRegions]);

  // Build grouped Yes/No chart data while keeping your core prediction logic
  const chartData = useMemo(() => {
    if (!isModelTrained || !region) return [];

    const raw = predictor.getSixPredictions(livingSpace, rooms, region);
    const allTrue  = raw.find(p => p.featureType === 'allTrue');
    const allFalse = raw.find(p => p.featureType === 'allFalse');

    // Apply your “averaging with allTrue/allFalse” logic for each feature
    const adjust = (p, ref) => Math.round((p.rent + ref.rent) / 2);

    const balconyYes = raw.find(p => p.name === 'Balcony');
    const balconyNo  = raw.find(p => p.name === 'No Balcony');

    const gardenYes  = raw.find(p => p.name === 'Garden');
    const gardenNo   = raw.find(p => p.name === 'No Garden');

    const liftYes    = raw.find(p => p.name === 'Lift');
    const liftNo     = raw.find(p => p.name === 'No Lift');

    return [
      {
        feature: 'Balcony',
        Yes: balconyYes && allTrue ? adjust(balconyYes, allTrue) : balconyYes?.rent || 0,
        No:  balconyNo  && allFalse ? adjust(balconyNo,  allFalse) : balconyNo?.rent  || 0,
      },
      {
        feature: 'Garden',
        Yes: gardenYes && allTrue ? adjust(gardenYes, allTrue) : gardenYes?.rent || 0,
        No:  gardenNo  && allFalse ? adjust(gardenNo,  allFalse) : gardenNo?.rent  || 0,
      },
      {
        feature: 'Lift',
        Yes: liftYes && allTrue ? adjust(liftYes, allTrue) : liftYes?.rent || 0,
        No:  liftNo  && allFalse ? adjust(liftNo,  allFalse) : liftNo?.rent  || 0,
      },
      {
        feature: 'All Features',
        Yes: allTrue?.rent  || 0,
        No:  allFalse?.rent || 0,
      }
    ];
  }, [isModelTrained, region, livingSpace, rooms, predictor]);

  // Chart visual config
  const CHART_CONFIG = {
    margin: { top: 12, right: 24, left: 26, bottom: 44 },
    barCategoryGap: '28%',
    gridStyle: { strokeDasharray: '3 3', stroke: '#eee', strokeWidth: 1 },
    fontSize: { axis: 12, label: 14 },
    barSize: 34,
  };

  const FEATURE_COLORS = { yes: '#22C55E', no: '#EF4444' };

  const GroupedChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={CHART_CONFIG.margin} barCategoryGap={CHART_CONFIG.barCategoryGap}>
        <CartesianGrid
          strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
          stroke={CHART_CONFIG.gridStyle.stroke}
          strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
        />
        <XAxis
          dataKey="feature"
          tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
          label={{ value: 'Feature', position: 'insideBottom', offset: -8, fontSize: CHART_CONFIG.fontSize.label }}
        />
        <YAxis
          tickFormatter={(v) => `€${v}`}
          tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
          label={{value: 'Predicted Rent',angle: -90,position: 'insideLeft',style: { fontSize: CHART_CONFIG.fontSize.label },dy: 40,}}
        />
        <Tooltip formatter={(v, n) => [`€${v}`, n]} />
        <Legend verticalAlign="top"/>
        <Bar dataKey="Yes" fill={FEATURE_COLORS.yes} barSize={CHART_CONFIG.barSize} radius={[2, 2, 0, 0]} />
        <Bar dataKey="No"  fill={FEATURE_COLORS.no}  barSize={CHART_CONFIG.barSize} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Property Details</Typography>
          <TextField
            label="Living Space (m²)"
            type="number"
            value={livingSpace}
            onChange={e => setLivingSpace(Number(e.target.value))}
            inputProps={{ min: 20, max: 350 }}
            fullWidth
            margin="normal"
            variant="outlined"
          />
          <TextField
            label="Rooms"
            type="number"
            value={rooms}
            onChange={e => setRooms(Number(e.target.value))}
            inputProps={{ min: 1, max: 10, step: 0.5 }}
            fullWidth
            margin="normal"
            variant="outlined"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Region</InputLabel>
            <Select
              value={region}
              label="Region"
              onChange={e => setRegion(e.target.value)}
            >
              {regions.map(r => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Predicted Rent by Feature
          </Typography>
          <Box sx={{ height: 320 }}>
            {chartData.length > 0 ? (
              <GroupedChart data={chartData} />
            ) : (
              <Typography>Configure inputs to see predictions</Typography>
            )}
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
};

export default PredictionTab;
