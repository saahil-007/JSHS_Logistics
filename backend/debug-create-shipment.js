
import axios from 'axios';

async function testCreateShipment() {
    const loginUrl = 'http://localhost:4000/api/auth/login';
    const createUrl = 'http://localhost:4000/api/customer/shipments';

    try {
        console.log('Logging in...');
        const loginRes = await axios.post(loginUrl, {
            email: 'customer@test.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        const payload = {
            origin: { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
            destination: { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
            packageDetails: {
                weight: 10,
                dimensions: '10x10x10'
            },
            deliveryType: 'standard',
            goodsImages: []
        };

        console.log('Sending Payload:', JSON.stringify(payload, null, 2));

        try {
            const res = await axios.post(createUrl, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Shipment Created:', res.data);
        } catch (err) {
            console.error('Creation Failed:', err.response?.status, err.response?.data);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

testCreateShipment();
