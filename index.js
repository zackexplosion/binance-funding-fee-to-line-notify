const main = require('./app')

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



