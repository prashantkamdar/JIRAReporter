var Client = require('node-rest-client').Client;
client = new Client();

var configLoader = require('./configLoader.js');
var userObj = configLoader.getLoginArgs();
var jiraURLs = configLoader.getJIRAURLs();
var slaCriteria = configLoader.getSLACriteria();
var holidays = configLoader.getHolidays();
var jiraIssuesExcel = configLoader.getJIRAIssuesExcel();

var JIRA = require('./JIRAServices.js');

JIRA.getIssuesForCriteria(client, userObj, jiraURLs, slaCriteria, holidays, jiraIssuesExcel);