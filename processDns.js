const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const CLOUDFLARE_API_URL = `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records`;

async function processFiles() {
    const recordsDir = path.join(__dirname, 'records');
    const files = await fs.readdir(recordsDir);

    for (const file of files) {
        if (path.extname(file) === '.txt') {
            const dnsFilePath = path.join(recordsDir, file);
            const content = await fs.readFile(dnsFilePath, 'utf-8').trim();
            const subdomain = path.basename(file, '.txt');

            const records = content.split('\n').map(line => line.trim()).filter(line => line);

            for (const recordLine of records) {
                const parts = recordLine.split(' ');
                const type = parts.shift();
                const recordValue = parts.slice(0, -1).join(' '); // All but the last part
                const priority = parts[parts.length - 1]; // Last part as priority for MX

                const record = {
                    type,
                    value: recordValue,
                    priority: type === 'MX' ? parseInt(priority) : null
                };

                if (isValidDNSRecord(record)) {
                    await addDNSRecord(subdomain, record);
                } else {
                    console.error(`Invalid DNS record in ${file}: ${JSON.stringify(record)}`);
                }
            }
        }
    }
}

function isValidDNSRecord(record) {
    const validTypes = ['A', 'CNAME', 'MX', 'TXT', 'AAAA'];
    return validTypes.includes(record.type) && record.value && !record.value.includes('is-cod.in');
}

async function addDNSRecord(subdomain, record) {
    const data = {
        type: record.type,
        name: `${subdomain}.is-cod.in`,
        content: record.type === 'MX' ? record.value : record.value,
        ttl: 1,
        proxied: false
    };

    if (record.type === 'MX' && record.priority !== null) {
        data.priority = record.priority; // Use user-defined priority for MX records
    }

    try {
        const response = await axios.post(CLOUDFLARE_API_URL, data, {
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Added DNS record: ${JSON.stringify(response.data)}`);
    } catch (error) {
        console.error(`Error adding DNS record: ${error.response ? error.response.data : error.message}`);
    }
}

processFiles();
const content = (await fs.readFile(dnsFilePath, 'utf-8')).trim();
