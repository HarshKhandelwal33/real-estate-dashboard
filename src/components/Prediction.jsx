import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';

// ---------------
// Model logic (simulated; replace with your actual trained Random Forest logic)
// ---------------
class RentPredictor {
  constructor() {
    // Simulate fit status and feature importance
    this.isTrained = false;
    this.data = [];
    this.featureImpacts = { balcony: 0, garden: 0, lift: 0 };
    this.regionMultipliers = {};
    // For simulation, set basic coefficients
    this.coeffs = {
      base: 800,
      livingSpace: 8.2,
      rooms: 120,
      balcony: 48,
      garden: 65,
      lift: 32
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
    // Accepts train data array from parent
    if (!Array.isArray(data) || data.length === 0) return;
    this.data = data;

    // Compute simple empirical region multipliers for demo
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

    // Calculate average model-based impact for each feature
    this.featureImpacts = this.calculateModelFeatureImpacts();
    this.isTrained = true;
  }

  // Main model prediction logic
  predict(row) {
    // Replace with actual RF `.predict` if available
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

  // Per your requirement: empirical model-based impact - for fixed inputs, toggle each feature
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

  // For property-level model-based feature effect: average delta for each feature (per your final suggestion)
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

  // Use singleton - or else everything retrains on state change.
  const [predictor] = useState(() => new RentPredictor());

  // Region utilities
  const cleanRegionName = (name) => predictor.cleanRegionName(name);
  const availableRegions = React.useMemo(() => (
    Array.isArray(data) ? (
      [...new Set(data
        .map(row => cleanRegionName(row.regio1))
      )].filter(Boolean).sort()
    ) : []
  ), [data]);

  // Training effect
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

  // Prediction computation effect
  useEffect(() => {
    if (isModelTrained && region) {
        const rawPredictions = predictor.getSixPredictions(livingSpace, rooms, region);

        const allTrue = rawPredictions.find(p => p.featureType === 'allTrue');
        const allFalse = rawPredictions.find(p => p.featureType === 'allFalse');
        
        const adjustedPredictions = rawPredictions
          .filter(p => p.featureType !== 'allTrue' && p.featureType !== 'allFalse') // Skip "allTrue"/"allFalse" in chart, or include if wanted
          .map(p => {
            // Averaging logic by type
            if (['balcony', 'garden', 'lift'].includes(p.featureType) && p.hasFeature && allTrue) {
              // Balcony Only, Garden Only, Lift Only: average with All true
              return { ...p, rent: Math.round((p.rent + allTrue.rent) / 2) };
            }
            if (['balcony', 'garden', 'lift'].includes(p.featureType) && !p.hasFeature && allFalse) {
              // No Balcony, No Garden, No Lift: average with All false
              return { ...p, rent: Math.round((p.rent + allFalse.rent) / 2) };
            }
            return p;
          });
        
        setPredictions(adjustedPredictions);
    }
    // eslint-disable-next-line
  }, [livingSpace, rooms, region, isModelTrained]);

  const CHART_CONFIG = {
    margin: { top: 18, right: 30, left: 12, bottom: 40 },
    barCategoryGap: '30%',
    gridStyle: { strokeDasharray: '3 3', stroke: '#eee', strokeWidth: 1 },
    fontSize: { axis: 13, label: 15 },
    barSize: 34,
  };
  
  const FEATURE_COLORS = {
    bar: '#1976D2'
  };
  // LollipopChart: pass predictions
  const LollipopChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        margin={CHART_CONFIG.margin}
        barCategoryGap={CHART_CONFIG.barCategoryGap}
      >
        <CartesianGrid 
          strokeDasharray={CHART_CONFIG.gridStyle.strokeDasharray}
          stroke={CHART_CONFIG.gridStyle.stroke}
          strokeWidth={CHART_CONFIG.gridStyle.strokeWidth}
        />
        <XAxis
          dataKey="name"
          angle={-15}
          textAnchor="end"
          interval={0}
          tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
          axisLine={{ stroke: '#666', strokeWidth: 1 }}
          tickLine={{ stroke: '#666', strokeWidth: 1 }}
          label={{ value: 'Feature', position: 'insideBottom', offset: -10, fontSize: CHART_CONFIG.fontSize.label }}
        />
        <YAxis
          tickFormatter={value => `€${value}`}
          fontSize={CHART_CONFIG.fontSize.axis}
          tick={{ fontSize: CHART_CONFIG.fontSize.axis }}
          axisLine={{ stroke: '#666', strokeWidth: 1 }}
          tickLine={{ stroke: '#666', strokeWidth: 1 }}
          label={{ value: 'Predicted Rent (€)', angle: -90, position: 'insideLeft', fontSize: CHART_CONFIG.fontSize.label }}
        />
        <Tooltip
          formatter={value => `€${value}`}
          labelStyle={{ fontWeight: 'bold', fontSize: CHART_CONFIG.fontSize.axis }}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        />
        {/* One bar per scenario */}
        <Bar
          dataKey="rent"
          fill={FEATURE_COLORS.bar}
          barSize={CHART_CONFIG.barSize}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="rent"
            position="top"
            formatter={value => `€${value}`}
          />
        </Bar>
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
          {/*
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ mt: 1 }} variant="body2" color="textSecondary">
            Baseline Rent (No Features)<br />
            <span style={{ fontWeight: 'bold', fontSize: 20 }}>
              €{predictions.find(p => !p.hasFeature)?.rent?.toLocaleString() || 0}
            </span>
          </Typography>
          */}
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Individual Feature Impact Comparison
          </Typography>
          <Box sx={{ height: 320 }}>
            {predictions.length > 0 ? (
              <LollipopChart data={predictions} />
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
