console.log('Testing Backend API Connectivity...');

const BASE_URL = 'http://localhost:4000/api';

async function testRole(role, email, pass) {
    console.log(`\nTesting ${role} (${email})...`);
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        if (!loginRes.ok) {
            console.error(`Login Failed: ${loginRes.status} ${loginRes.statusText}`);
            try { console.error(await loginRes.text()); } catch (e) { }
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        const user = loginData.user;

        console.log(`Login OK. Token received.`);
        console.log(`User ID: ${user.id}, Role: ${user.role}`);

        const shipmentsRes = await fetch(`${BASE_URL}/shipments?limit=3`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (shipmentsRes.ok) {
            const data = await shipmentsRes.json();
            console.log(`Shipments Fetch OK. Count: ${data.shipments?.length}`);
            if (data.shipments?.length > 0) {
                console.log('First shipment status:', data.shipments[0].status);
            }
        } else {
            console.error(`Shipments Fetch Failed: ${shipmentsRes.status} ${shipmentsRes.statusText}`);
            try { console.error(await shipmentsRes.text()); } catch (e) { }
        }
    } catch (err) {
        console.error('Network/Script Error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

async function main() {
    await testRole('DRIVER', 'driver1@test.com', 'password123');
    await testRole('CUSTOMER', 'customer@test.com', 'password123');
}

main();
