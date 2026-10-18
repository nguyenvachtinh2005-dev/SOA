
const express = require('express');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Product Management Service is running'
    });
});

app.use('/products', productRoutes);

// API không tồn tại
app.use((req, res) => {
    res.status(404).json({
        message: 'API không tồn tại'
    });
});

module.exports = app;
