async function testTable2() {
  const table2Id = '10739156-1a62-4fd7-bc06-e0621dbed844'; // Real Table 2
  const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

  const res = await fetch('https://www.cleverops.in/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      items: [
        { menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 },
        { menuItemId: 'e3626e22-d5f7-485d-a8ed-5e3506baa0b2', quantity: 1, price: 320, variantName: 'Full', notes: 'Extra creamy, low spice' }
      ],
      specialInstructions: 'Live Production Fresh Order on Table 2'
    })
  });

  console.log('Status:', res.status);
  const body = await res.json();
  console.log('Body:', JSON.stringify(body, null, 2));
}

testTable2().catch(console.error);
