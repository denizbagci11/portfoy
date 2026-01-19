import { fetchTefasPrice } from './src/lib/priceApis'

async function test() {
    console.log('Testing TEFAS price fetch for AK2...')
    const price = await fetchTefasPrice('AK2')
    console.log('Result:', price)
}

test()
