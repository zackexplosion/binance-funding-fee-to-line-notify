require("dotenv").config();

const { API_KEY, API_SECRET, LINE_NOTIFY_TOKEN } = process.env;

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
    BUSD: 0,
    USDT: 0,
  };
  const now = dayjs();
  res = incomes
    .filter((_) => _.incomeType === "FUNDING_FEE")
    .filter((_) => dayjs(now).diff(_.time, "hour") < 8)
    .map((_) => {
      results[_.asset] = Big(_.income).plus(results[_.asset]);

      return {
        amount: _.income,
        asset: _.asset,
        time: dayjs(_.time).format(),
      };
    });

  if (res.length === 0) {
    return false;
  }

  const message = `${dayjs(res[0].time).format(
    "YYYY/MM/DD HH:mm"
  )}\n實收 BUSD: ${results.BUSD.toNumber()}, USDT: ${results.USDT.toNumber()}`;
  lineNotify(message);

  return res;
}

// setup schedule job
const job = schedule.scheduleJob("30 */8 * * *", function () {
  const res = main();
  if (!res) {
    setTimeout(() => {
      main();
    }, 1000 * 60 * 30);
  }

  showNextInvocationTime();
});

function showNextInvocationTime() {
  console.log(
    "Next invocation in",
    dayjs(job.nextInvocation()._date.ts).format()
  );
}

showNextInvocationTime();

main();
