require("dotenv").config();

const { getWithPaging: getWithPagingDiscourse } = require("./discourse");
require("./discord");

const discourseHost = process.env.DISCOURSE_HOST;

const main = async () => {
  const data = await getWithPagingDiscourse(
    `https://${discourseHost}/admin/users/list/active.json`
  );
  // console.log(data);
};

(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
  }
})();
