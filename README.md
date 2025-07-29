# German Real Estate Analytics Dashboard

A comprehensive dashboard for analyzing German real estate data with advanced machine learning predictions using Random Forest algorithm.

## Features

### 📊 Data Visualization
- **Interactive Charts**: Bar charts, pie charts, area charts, and line charts
- **Geographic Analysis**: Regional breakdown of property data
- **Feature Impact Analysis**: Comparison of property features (balcony, garden, lift) on rent prices
- **Construction Year Trends**: Historical analysis of property construction and rent trends

### 🤖 Machine Learning Predictions
- **Random Forest Algorithm**: Advanced ensemble learning for accurate rent predictions
- **Feature Uncertainty Analysis**: Violin charts showing prediction distributions
- **Interactive Prediction Tool**: Real-time rent estimation based on property characteristics

### 🎯 Key Components

#### Random Forest Implementation
- **Algorithm**: Uses `ml-random-forest` library for regression
- **Configuration**:
  - 50 estimators (trees)
  - Maximum depth of 10
  - Minimum samples split: 5
  - Minimum samples leaf: 2
  - Fixed seed for reproducibility

#### Violin Chart Visualization
- **D3.js Integration**: Custom violin chart using kernel density estimation
- **Uncertainty Representation**: Shows prediction distributions with noise simulation
- **Interactive Features**: Hover tooltips and responsive design
- **Color Coding**: Blue for "With Feature", Red for "Without Feature"

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd real-estate-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Dependencies

### Core Libraries
- **React 18**: Modern React with hooks
- **Material-UI**: UI component library
- **Recharts**: Chart library for data visualization
- **D3.js**: Advanced data visualization

### Machine Learning
- **ml-random-forest**: Random Forest regression algorithm
- **ml-regression**: Additional regression algorithms (legacy)

### Data Processing
- **Papa Parse**: CSV parsing
- **Vite**: Build tool and development server

## Usage

### Making Predictions
1. Navigate to the "Prediction" tab
2. Enter property details:
   - Living space (square meters)
   - Number of rooms
   - Region/State
3. Click "Compute Rent with Random Forest"
4. View predictions and uncertainty distributions

### Understanding the Violin Chart
- **Width**: Represents the density of predictions at each rent level
- **Median Line**: Black line showing the median prediction
- **Color**: Blue for properties with the feature, Red for properties without
- **Distribution**: Shows the uncertainty in predictions due to model variance

### Feature Impact Analysis
The dashboard compares how different features affect rent predictions:
- **Balcony**: Impact on rent when balcony is present/absent
- **Garden**: Impact on rent when garden is present/absent  
- **Lift**: Impact on rent when elevator is present/absent

## Data Structure

The application expects CSV data with the following columns:
- `totalRent`: Total monthly rent in euros
- `livingSpace`: Living space in square meters
- `noRooms`: Number of rooms
- `regio1`: State/Region
- `balcony`: Boolean indicating balcony presence
- `garden`: Boolean indicating garden presence
- `lift`: Boolean indicating elevator presence
- `yearConstructed`: Year of construction
- `condition`: Property condition

## Technical Details

### Random Forest Training
```javascript
const options = {
  nEstimators: 50,        // Number of trees
  maxDepth: 10,           // Maximum tree depth
  minSamplesSplit: 5,     // Minimum samples to split node
  minSamplesLeaf: 2,      // Minimum samples in leaf
  seed: 42               // Random seed for reproducibility
};

const rf = new RandomForest(options);
rf.train(X, Y);
```

### Prediction Uncertainty
The violin chart generates multiple predictions by adding small random noise to input features, simulating the uncertainty inherent in machine learning predictions.

### Kernel Density Estimation
Uses Epanechnikov kernel for smooth density estimation:
```javascript
function kernelEpanechnikov(K) {
  return function(u) {
    return Math.abs(u /= K) <= 1 ? 0.75 * (1 - u * u) / K : 0;
  };
}
```

## Performance Considerations

- **Data Size**: Requires at least 10 samples for Random Forest training
- **Memory Usage**: Large datasets may impact performance
- **Build Size**: Bundle size warning due to D3.js and ML libraries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- German real estate data providers
- D3.js community for visualization tools
- ML.js library contributors 