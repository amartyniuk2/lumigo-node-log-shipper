const expect = require("chai").expect;
const sinon = require("sinon");
const LumigoLogger = require("../src/index");
const awsUtils = require("../src/utils/aws_utils");
const firehoseUtils = require("../src/utils/firehose_utils");
const stsUtils = require("../src/utils/sts_utils");
const fixutres = require("../test/fixtures");

describe("log shipping functionality ", () => {

	it("sends logs - happy flow", (done) => {
		let fake = sinon.fake.returns({"FailedPutCount": 0, "RequestResponses": []});
		let getFirehoseClientFake = sinon.fake.returns({"Credentials": {
			"AccessKeyId": "AccessKeyId",
			"SecretAccessKey": "SecretAccessKey",
			"SessionToken": "SessionToken"}});
		sinon.stub(firehoseUtils.Firehose.prototype, "pushToFirehose").resolves(fake());
		sinon.stub(stsUtils, "assumeRole").resolves(getFirehoseClientFake());
		LumigoLogger.shipLogs(fixutres.rawAwsEvent(),"[ERROR]").then(function(data) {
			expect(data).to.eq(1);
			stsUtils.assumeRole.restore();
			firehoseUtils.Firehose.prototype.pushToFirehose.restore();
			done();
		});
		expect(fake.calledOnce).to.eq(true);
	});

	it("doesn't ship big event", (done) => {
		sinon.stub(firehoseUtils.Firehose.prototype, "validFirehoseEvent").returns(false);
		let getFirehoseClientFake = sinon.fake.returns({"Credentials": {
			"accessKeyId": "AccessKeyId",
			"secretAccessKey": "SecretAccessKey",
			"sessionToken": "SessionToken"}});
		sinon.stub(stsUtils, "assumeRole").resolves(getFirehoseClientFake());
		LumigoLogger.shipLogs(fixutres.rawAwsEvent()).then(function(data) {
			expect(data).to.eq(0);
			stsUtils.assumeRole.restore();
			firehoseUtils.Firehose.prototype.validFirehoseEvent.restore();
			done();
		});
	});

	it("doesn't ship anything", (done) => {
		sinon.stub(awsUtils, "extractAwsLogEvent").returns({"logEvents": []});
		let getFirehoseClientFake = sinon.fake.returns({"Credentials": {
			"accessKeyId": "AccessKeyId",
			"secretAccessKey": "SecretAccessKey",
			"sessionToken": "SessionToken"}});
		sinon.stub(stsUtils, "assumeRole").resolves(getFirehoseClientFake());
		LumigoLogger.shipLogs({}).then(function(data) {
			expect(data).to.eq(0);
			awsUtils.extractAwsLogEvent.restore();
			stsUtils.assumeRole.restore();
			done();
		});
	});

	it("ships 0 logs when kinesis couldn't be initiated", (done) => {
		sinon.stub(stsUtils, "assumeRole").rejects({"error": true});
		LumigoLogger.shipLogs(fixutres.rawAwsEvent()).then(function(data) {
			expect(data).to.eq(0);
			stsUtils.assumeRole.restore();
			done();
		});
	});
});