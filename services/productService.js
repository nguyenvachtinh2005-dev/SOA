
const axios = require('axios');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

// Lấy thông tin sản phẩm
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

        const product = response.data.product || response.data;

        if (!product || !product.id) {
            throw new Error('Không tìm thấy sản phẩm');
        }

        return product;

    } catch (error) {
        if (error.response) {
            throw new Error(
                error.response.data.message || 'Lỗi lấy thông tin sản phẩm'
            );
        }

        throw error;
    }
};

// Kiểm tra tồn kho
const checkStock = async (productId, quantity, token) => {
    const product = await getProductById(productId, token);

    const stock = Number(
        product.quantity ?? product.stock_quantity
    );

    if (!Number.isFinite(stock)) {
        throw new Error('Không đọc được số lượng tồn kho');
    }

    if (stock < quantity) {
        throw new Error(
            `Sản phẩm ${product.name} chỉ còn ${stock} sản phẩm`
        );
    }

    return {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: stock
    };
};

module.exports = {
    getProductById,
    checkStock
};
