
const axios = require('axios');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

const getProductById = async (productId, token) => {
    try {
        const response = await axios.get(
            `${PRODUCT_SERVICE_URL}/products/${productId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const product =
            response.data.data ||
            response.data.product ||
            response.data;

        return product;
    } catch (error) {
        if (error.response) {
            throw new Error(
                error.response.data.message || `Không tìm thấy sản phẩm ${productId}!`
            );
        }

        throw new Error('Không thể kết nối đến Product Service!');
    }
};

// Lấy giá nhập sản phẩm
const getProductCost = (product) => {
    const cost =
        product.cost_price ??
        product.import_price ??
        product.purchase_price ??
        product.unit_cost ??
        product.cost ??
        product.importPrice;

    if (cost === undefined || cost === null || !Number.isFinite(Number(cost))) {
        throw new Error(
            `Sản phẩm ${product.id || ''} chưa có thông tin giá nhập!`
        );
    }

    return Number(cost);
};

// Lấy giá bán sản phẩm
const getProductPrice = (product) => {
    const price =
        product.price ??
        product.sale_price ??
        product.selling_price ??
        product.unit_price;

    if (price === undefined || price === null || !Number.isFinite(Number(price))) {
        throw new Error(
            `Sản phẩm ${product.id || ''} chưa có thông tin giá bán!`
        );
    }

    return Number(price);
};

// Lấy số lượng tồn kho
const getProductStock = (product) => {
    return (
        product.stock_quantity ??
        product.quantity ??
        product.stock ??
        product.inventory ??
        0
    );
};

module.exports = {
    getProductById,
    getProductCost,
    getProductPrice,
    getProductStock
};
