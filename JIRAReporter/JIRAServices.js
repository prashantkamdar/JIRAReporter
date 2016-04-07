var JIRASession = null;
var Client = null;
var UserObj = null;
var JIRAURLs = null;
var SLACriteria = null;
var Holidays = null;
var JIRAIssuesExcel = null;
var xlsx = require('xlsx-writestream');
var saturday = null;
var sunday = null;

(function (JIRAApi) {

    JIRAApi.getSessionHeader = function (next) {

        if (!JIRASession) {

            var loginArgs = {
                data: {
                    "username": UserObj.username,
                    "password": UserObj.password
                },
                headers: {
                    "Content-Type": "application/json"
                }
            };

            Client.post(JIRAURLs.authURL, loginArgs, function (data, response) {

                if (response.statusCode == 200) {

                    var session = data.session;

                    JIRASession = {
                        headers: {
                            cookie: session.name + '=' + session.value,
                            "Content-Type": "application/json"
                        }
                    };

                    next(null, JIRAApi);
                }
                else { }
            });
        }
    };

    JIRAApi.getIssuesForCriteria = function (client, userObj, jiraurls, slacriteria, holidays, jiraIssuesExcel) {

        Client = client;
        UserObj = userObj;
        JIRAURLs = jiraurls;
        SLACriteria = slacriteria;
        Holidays = holidays;
        JIRAIssuesExcel = jiraIssuesExcel;

        JIRAApi.getSessionHeader(function (err, JIRAApi) {
            if (err) { console.log(err); }
            else {

                var SLATimeFrame = null;
                saturday = getSaturday(new Date());
                sunday = new Date();
                sunday = new Date(sunday.setDate(saturday.getDate() - 6));

                saturday = saturday.yyyymmdd();
                sunday = sunday.yyyymmdd();

                var timeFrame = " AND created >= " + sunday + " AND created <= " + saturday;

                var jiraURL = JIRAURLs.searchURL + SLACriteria + timeFrame;

                Client.get(jiraURL, JIRASession, function (searchResult, response) {

                    var issues = [];
                    var JIRAIssue = {};

                    if (searchResult) {

                        searchResult.issues.forEach(function (issue) {

                            JIRAIssue = {
                                "Key": issue.key,
                                "Status": issue.fields.status.name,
                                "Created": issue.fields.created,
                                "Updated": issue.fields.updated,
                                "Resolution Date": issue.fields.resolutiondate,
                                "Tech Category": issue.fields.customfield_14746.value,
                                "Component": issue.fields.components[0].name,
                                "Assignee": issue.fields.assignee.displayName?issue.fields.assignee.displayName : "",
                                "Summary": issue.fields.summary,
                                "Resolve Time": "",
                                "SLA": ""
                            };

                            issues.push(JIRAIssue);
                        });
                    }

                    JIRAApi.SLAGenerator(issues);
                });
            }
        });
    };

    JIRAApi.SLAGenerator = function (data) {
        data.forEach(function (entry) {
            if (entry["Resolution Date"] != "") {
                var obj = getResolveTimeAndSLA(new Date(entry["Created"]), new Date(entry["Resolution Date"]));
                entry["Resolve Time"] = obj.resolveTime;
                entry["SLA"] = obj.sla;
            }
        });

        var JIRATimeStamp = new Date();
        JIRATimeStamp = JIRATimeStamp.YYYYMMDDHHMMSS();

        xlsx.write(JIRAIssuesExcel + "JIRAIssues-" + sunday + "TO" + saturday + ".xlsx", data, function (err) {
            if (err) { console.log(err); }
            else {
                console.log("Saved excel file");
                process.exit();
            }
        });
    };

    function getISTDateTime(data) {
        return new Date(new Date(data).getTime() + (new Date(data).getTimezoneOffset() * 60000) + (3600000 * 330));
    }

    function getResolveTimeAndSLA(startDate, endDate) {

        var daysWithoutWeekend = [];
        var daysWithoutHolidays = [];

        var minutesofStartDate = minutesUntilMidnight(startDate);
        var minutesofEndDate = minutesFromMidnight(endDate);

        var totalTime = (minutesofStartDate + minutesofEndDate) / 60 / 24;
        var sla = null;

        for (startDate; startDate <= endDate; startDate.setDate(startDate.getDate() + 1)) {

            if (startDate.getDay() == 0 || startDate.getDay() == 6) {
                continue;
            }
            daysWithoutWeekend.push(new Date(startDate));
        }

        var flag = 0;

        for (var i = 0; i < daysWithoutWeekend.length; i++) {
            flag = 0;
            for (var j = 0; j < Holidays.length; j++) {
                if (new Date(daysWithoutWeekend[i]).yyyymmdd() == Holidays[j]) {
                    flag = 1;
                    break;
                }
            }
            if (flag == 0) {
                daysWithoutHolidays.push(daysWithoutWeekend[i]);
            }
        }

        var resolveDays = daysWithoutHolidays.length - 1;

        if (resolveDays > 1) {
            sla = "Not Met";
        } else if (totalTime > 1) {
            sla = "Not Met";
        }
        else {
            sla = "Met";
        }

        return {
            resolveTime: resolveDays + "." + totalTime ,
            sla: sla
        };
    }

    function minutesUntilMidnight(data) {
        var midnight = new Date(data);
        midnight.setHours(24);
        midnight.setMinutes(0);
        midnight.setSeconds(0);
        midnight.setMilliseconds(0);
        return (midnight.getTime() - new Date(data).getTime()) / 1000 / 60;
    }

    function minutesFromMidnight(data) {
        var startday = new Date(data);
        startday.setHours(0);
        startday.setMinutes(0);
        startday.setSeconds(0);
        startday.setMilliseconds(0);
        return (new Date(data).getTime() - startday.getTime()) / 1000 / 60;
    }

    Date.prototype.YYYYMMDDHHMMSS = function () {
        var yyyy = this.getFullYear().toString();
        var MM = pad(this.getMonth() + 1, 2);
        var dd = pad(this.getDate(), 2);
        var hh = pad(this.getHours(), 2);
        var mm = pad(this.getMinutes(), 2)
        var ss = pad(this.getSeconds(), 2)

        return yyyy + MM + dd + hh + mm + ss;
    };

    Date.prototype.yyyymmdd = function () {
        var yyyy = this.getFullYear().toString();
        var mm = (this.getMonth() + 1).toString();
        var dd = this.getDate().toString();
        return yyyy + "-" + (mm[1]?mm:"0" + mm[0]) + "-" + (dd[1]?dd:"0" + dd[0]);
    };

    function pad(number, length) {
        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    function getSaturday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - (day + 1);
        return new Date(d.setDate(diff));
    }

})(module.exports);