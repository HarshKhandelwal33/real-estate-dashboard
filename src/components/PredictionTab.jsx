import { useState, useEffect } from 'react';
import MultivariateLinearRegression from 'ml-regression-multivariate-linear';
import { TextField, Button, Typography, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// Helper to one-hot encode categorical variables
function oneHotEncode(value, categories) {
  return categories.map(cat => (value === cat ? 1 : 0));
}

// Helper to encode boolean/amenity features
function boolToNum(val) {
  if (val === true || val === 'true' || val === 1 || val === '1') return 1;
  return 0;
}

const PredictionTab = ({ data, states, conditions }) => {
  const [predictionInput, setPredictionInput] = useState({
    livingSpace: '',
    noRooms: '',
    yearConstructed: '',
    condition: '',
    regio1: states && states.length > 0 ? states[0] : '',
    balcony: '',
    cellar: '',
    lift: '',
    garden: ''
  });
  const [predictedRent, setPredictedRent] = useState(null);

  // Gather all unique values for one-hot encoding
  const allStates = Array.from(new Set(data.map(row => row.regio1)));
  const allConditions = Array.from(new Set(data.map(row => row.condition)));

  // Train prediction model
  useEffect(() => {
    if (data.length > 0) {
      const filteredData = data; // Use all data for training
      const x = filteredData.map(row => [
        row.livingSpace,
        row.noRooms,
        row.yearConstructed,
        ...oneHotEncode(row.condition, allConditions),
        ...oneHotEncode(row.regio1, allStates),
        boolToNum(row.balcony),
        boolToNum(row.cellar),
        boolToNum(row.lift),
        boolToNum(row.garden)
      ]);
      const y = filteredData.map(row => [row.totalRent]);
      if (x.length > 1 && y.length > 1) {
        const regression = new MultivariateLinearRegression(x, y);
        window._regressionModel = regression; // Save for prediction
      }
    }
  }, [data]);

  // Predict rent
  const predictRent = () => {
    const { livingSpace, noRooms, yearConstructed, condition, regio1, balcony, cellar, lift, garden } = predictionInput;
    // If 'All' is selected for state, use the first real state
    const selectedState = (regio1 === 'All' && allStates.length > 0) ? allStates[0] : regio1;
    if (
      livingSpace && noRooms && yearConstructed && condition && selectedState &&
      !isNaN(livingSpace) && !isNaN(noRooms) && !isNaN(yearConstructed)
    ) {
      const inputFeatures = [
        parseFloat(livingSpace),
        parseFloat(noRooms),
        parseFloat(yearConstructed),
        ...oneHotEncode(condition, allConditions),
        ...oneHotEncode(selectedState, allStates),
        balcony === 'Yes' ? 1 : 0,
        cellar === 'Yes' ? 1 : 0,
        lift === 'Yes' ? 1 : 0,
        garden === 'Yes' ? 1 : 0
      ];
      const regression = window._regressionModel;
      console.log('Input features:', inputFeatures);
      if (regression) {
        const prediction = regression.predict([inputFeatures]);
        console.log('Prediction output:', prediction);
        if (Array.isArray(prediction) && typeof prediction[0] === 'number' && !isNaN(prediction[0])) {
          setPredictedRent(prediction[0].toFixed(2));
        } else {
          setPredictedRent('Prediction unavailable');
        }
      } else {
        setPredictedRent('Model not trained');
      }
    } else {
      setPredictedRent('Invalid input');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPredictionInput(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Living Space (m²)"
          name="livingSpace"
          type="number"
          value={predictionInput.livingSpace}
          onChange={handleInputChange}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Number of Rooms"
          name="noRooms"
          type="number"
          value={predictionInput.noRooms}
          onChange={handleInputChange}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Year Constructed"
          name="yearConstructed"
          type="number"
          value={predictionInput.yearConstructed}
          onChange={handleInputChange}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Condition</InputLabel>
          <Select
            name="condition"
            value={predictionInput.condition}
            onChange={handleInputChange}
            label="Condition"
          >
            {conditions.map((condition) => (
              <MenuItem key={condition} value={condition}>{condition}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>State</InputLabel>
          <Select
            name="regio1"
            value={states.includes(predictionInput.regio1) ? predictionInput.regio1 : ''}
            onChange={handleInputChange}
            label="State"
          >
            {states.map((state) => (
              <MenuItem key={state} value={state}>{state}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Balcony</InputLabel>
          <Select
            name="balcony"
            value={predictionInput.balcony}
            onChange={handleInputChange}
            label="Balcony"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Cellar</InputLabel>
          <Select
            name="cellar"
            value={predictionInput.cellar}
            onChange={handleInputChange}
            label="Cellar"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Lift</InputLabel>
          <Select
            name="lift"
            value={predictionInput.lift}
            onChange={handleInputChange}
            label="Lift"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Garden</InputLabel>
          <Select
            name="garden"
            value={predictionInput.garden}
            onChange={handleInputChange}
            label="Garden"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" onClick={predictRent} sx={{ mt: 2 }}>
          Predict Rent
        </Button>
        {predictedRent && (
          <Typography variant="h6" sx={{ mt: 2 }}>
            Predicted Rent: {predictedRent} €
          </Typography>
        )}
      </Grid>
    </Grid>
  );
};

export default PredictionTab; 