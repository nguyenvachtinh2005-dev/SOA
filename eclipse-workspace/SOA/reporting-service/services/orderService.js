
const axios = require('axios');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;

const getOrderById = async (orderId, token) => {
    try {
        const response = await axios.get(
            `${ORDER_SERVICE_URL}/orders/${orderId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = response.data.data || response.data.order || response.data;

        // Hỗ trợ cả trường hợp API trả về order và items riêng
        const order = result.order || result;

        let items = result.items || order.items;

        if (!Array.isArray(items)) {
            items = [];
        }

        return {
            ...order,
            items
        };
    } catch (error) {
        if (error.response) {
            throw new Error(
                error.response.data.message || 'Không lấy được thông tin đơn hàng!'
            );
        }

        throw new Error('Không thể kết nối đến Order Service!');
    }
};

module.exports = {
    getOrderById
};
