require("dotenv").config();

const { API_KEY, API_SECRET, LINE_NOTIFY_TOKEN } = process.env;
const USER_TIME_ZONE = process.env.USER_TIME_ZONE || 'Asia/Taipei'
const schedule = require("node-schedule");
const Binance = require("node-binance-api");
const dayjs = require("dayjs");
const Big = require("big.js");
const axios = require("axios");
const FormData = require("form-data");
const binance = new Binance().options({
  APIKEY: API_KEY,
  APISECRET: API_SECRET,
});


const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone') // dependent on utc plugin
dayjs.extend(utc)
dayjs.extend(timezone)

function lineNotify(message) {
  const form_data = new FormData();
  form_data.append("message", message);

  const headers = Object.assign(
    {
      Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
    },
    form_data.getHeaders()
  );

  axios({
    method: "post",
    url: "https://notify-api.line.me/api/notify",
    data: form_data,
    headers: headers,
  }).catch(function (error) {
    if (error.response) {
      console.error(error.response.status);
      console.error(error.response.data);
    } else {
      console.error(error);
    }
  });
}

async function main() {
  const incomes = await binance.futuresIncome();

  var res = [];
  var results = {
    // BUSD: 0,
    // USDT: 0,
  };
  const now = dayjs();
  res = incomes
    .filter((_) => _.incomeType === "FUNDING_FEE")
    .filter((_) => dayjs(now).diff(_.time, "hour") < 8)
    .map((_) => {
      results[_.asset] = Big(_.income).plus(results[_.asset] || 0);

      return {
        amount: _.income,
        asset: _.asset,
        time: dayjs(_.time).format(),
      };
    });

  const deliveryIncomes = await binance.deliveryIncome()

  deliveryIncomes
    .filter(_ => _.incomeType === 'FUNDING_FEE')
    .filter((_) => dayjs(now).diff(_.time, "hour") < 8)
    .forEach(_ => {
      results[_.asset] = Big(_.income).plus(results[_.asset] || 0);

      console.log(_)
    })

  // console.log(deliveryIncomes)


  if (res.length === 0) {
    return false;
  }

  const timestamp = dayjs(res[0].time).tz(USER_TIME_ZONE).format("YYYY/MM/DD HH:mm")

  var resultStringArray = []
  Object.keys(results).forEach(_ => {
    resultStringArray.push(`${_}: ${results[_].toNumber()}`)
  })
  const message = `${timestamp} 實收 \n${resultStringArray.join('\n')}`;
  lineNotify(message);

  return res;
}


module.exports = main