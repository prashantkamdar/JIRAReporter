(function (config) {
    
    var nconf = require('nconf');
    nconf.file({ file: './config.json' });
    
    config.getLoginArgs = function () {
        var username = nconf.get("loginCreds:username");
        var password = nconf.get("loginCreds:password");
        
        return {
            username: username,
            password: password
        };
    };
    
    config.getJIRAURLs = function () {
        var authURL = nconf.get("JIRAURLs:AuthURL");
        var searchURL = nconf.get("JIRAURLs:SearchURL");
        
        return {
            authURL: authURL,
            searchURL : searchURL
        };
    };
    
    config.getSLACriteria = function () {
        var SLACriteria = nconf.get("SLACriteria");
        
        return  SLACriteria;
    };

    config.getHolidays = function () {
        var Holidays = nconf.get("Holidays");
        
        return Holidays;
    };
    
    config.getJIRAIssuesExcel = function () {
        var JIRAIssuesExcel = nconf.get("JIRAIssuesExcel");
        
        return JIRAIssuesExcel;
    };    

})(module.exports);