const { promisify } = require('util');
const sleep = promisify(setTimeout);
const got = require('got');
const HttpAgent = require('agentkeepalive');
const convert = require('xml-js'); 
const webhook = require('webhook-discord');
const config = require('./config.json');
const Hook = new webhook.Webhook(config['webhook']);
const { HttpsAgent } = HttpAgent;

var sku = config['sku']; 
var monitor_status = true; 
var error = false;
var monitor_delay = config['monitor_delay'];
var error_delay = config['error_delay'];

async function send_hook(){

	const msg = new webhook.MessageBuilder()
                .setName('Footsites restock monitor')
                .setText(`sku : ${sku} just restocked`);

	Hook.send(msg).catch(() => {
		console.log('Failed to send webhook');
	});

};

async function monitor(){

	if(!sku){

		console.log('You must have a sku to monitor');
		return;
	};

	if(!monitor_status){

		await send_hook();
		return;
	
	}else if(error){

		error = false;
		await sleep(error_delay);

	}else{

		await sleep(monitor_delay);
	};

	console.log(`Monitoring ${sku}`);

	var monitor_url = `https://www.footlocker.com/api/products/pdp/${sku}`;

	var get = await got.get(monitor_url, {

		headers : {

			    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
			    "accept-language": "en",
			    "cache-control": "no-cache",
			    "pragma": "no-cache",
			    "sec-ch-ua": "\"Chromium\";v=\"88\", \"Google Chrome\";v=\"88\", \";Not A Brand\";v=\"99\"",
			    "sec-ch-ua-mobile": "?0",
			    "sec-fetch-dest": "document",
			    "sec-fetch-mode": "navigate",
			    "sec-fetch-site": "none",
			    "sec-fetch-user": "?1",
			    "upgrade-insecure-requests": "1",
			    "user-agent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36"

		}, 

		agent : {

				https: new HttpsAgent(),
		}

	}).catch(() => {

		error = true;
	});

	if(error){

		await monitor();
	};

	var status_code = get.statusCode;

	if(status_code == 200){

		var data = get.body; 

		console.log(data);
		data = await convert.xml2json(data, { compact: true, spaces: 0 });
		data = JSON.parse(data);

		try{

			data = data['pdp']['name']['_text'];

			if(data){

				monitor_status = false; 
				await monitor();
			};
		}catch{

			error = true; 
			await monitor();
		};
	}else{

		await monitor();
	};
};

monitor().catch(() => {
	console.log('Error starting monitor');
});