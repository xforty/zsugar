/****************************************************************************
 **
 ** Copyright (C) 2012 xforty technologies. All rights reserved.
 ** Copyright (C) 2011 Irontec SL. All rights reserved.
 **
 ** This file may be used under the terms of the GNU General Public
 ** License version 3.0 as published by the Free Software Foundation
 ** and appearing in the file LICENSE.GPL included in the packaging of
 ** this file.  Please review the following information to ensure GNU
 ** General Public Licensing requirements will be met:
 **
 ** This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 ** WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 **
 ****************************************************************************/
/***
 * ironsugar
 * 
 * This object works as wrapper for the zSugar Zimlet JSON petitions to Sugar
 *  
 * This zimlets invokes some SugarCRM methods for Importing/Exporting data. The object
 * responsible for that task is ironsugar (@see sugarestapi.js). Originally, this method
 * invokation was made via SugarCRM REST API (included in version 5.5.2 and above), proxying
 * all petitions through a jsp (@see redirect.jsp) which manages how data is sent to
 * SugarCRM server.
 * 
 * @param url 	@Deprecated
 * @param u		Username
 * @param p		Password
 * @param obj	zSugar Zimlet object
 *  
 */
function ironsugar(url,u,p,obj) {
		
	this.url = url;
	this.user = u;
	this.uid = false;
	this.pass = p;
	this.application = "ironsugar zimlet";
	this.userData = [];
	
	this.sessid = false;
	
	this.cachedCallback = false;
	this.parent = obj;
	
	this.stopTimer = false
	
}

/***
 * ironsugar.prototype._doPOST
 *
 * This function sends JSON petitions to a local JSP (redirect.jsp)
 * which actually sends the final messages to SugarCRM
 * This JSP acts as a proxy for all petitions from zSugar. The reason
 * for this is that, in some cases we want some task done in server
 * side (that's the JSP) and other in the client side (that's this
 * JavaScript code) 
 * 
 * @param url		@Deprecated
 * @param params	JSON structure
 * @param callback	Callback Function after async Ajax call
 */
ironsugar.prototype._doPOST = function (url, params, callback) {

		var hdrs = [];
		hdrs["Content-type"] = "application/x-www-form-urlencoded";
//		hdrs["Content-length"] = params.length;
//		hdrs["Connection"] = "close";
//		var entireurl = ZmZimletBase.PROXY + url;
//		AjxRpc.invoke(params, entireurl, hdrs, callback, false);

		var jspUrl = this.parent.getResource("redirect.jsp");
	    AjxRpc.invoke(params, jspUrl, hdrs, callback, false);
}

/***
 * ironsugar.prototype._callREST
 *
 * This function creates the JSON structure that will be sent
 * to SugarCRM
 * 
 * This sctucture contains:
 * - method - SugarCRM method
 * - input_type - JSON
 * - response_type - JSON
 * - rest_data - Data depending on method
 * - sugar_url - Destiny SugarCRM host address (used by redirect.jsp proxy)
 * 
 * @param method	SugarCRM JSON method (from SCRM Rest API)
 * @param data		Method data
 * @param callback	Callback Function after async Ajax call
 * 
 */
ironsugar.prototype._callREST = function (method,data,callback) {
	var extraArgs = [];

	if (arguments.length>3) { // La llamada es con 4 argumentos a tope! desde 
		for (var i=3;i<arguments.length;i++) {
			extraArgs.push(arguments[i]);
		}
	}

	var paramsArray = [
		["method", method],
		["input_type", "JSON"],
		["response_type", "JSON"],
		["rest_data", data],
		["sugar_url", this.url ]
	];
	var arr = [];
	for (var i = 0; i < paramsArray.length; i++) {
		arr.push(AjxStringUtil.urlComponentEncode(paramsArray[i][0]) + "=" + AjxStringUtil.urlComponentEncode(paramsArray[i][1]));
	}

	this._doPOST(this.url, arr.join("&"), new AjxCallback(this, callback,extraArgs));
}

/***
 * ironsugar.prototype.postlogin
 *
 * Callback function that checks authentication after 
 * sending Login/Keepalive Request
 * 
 * @param response	Response JSON data from SugarCRM 
 * 
 */
ironsugar.prototype.postlogin = function(response) {
    try {
	var j = eval("(" + response.text + ")");
	
	if (!j.id) this.sessid = false;
	else {
		this.sessid = j.id;
		this.uid = j['name_value_list']['user_id']['value'];
	}
	this.initTimer();
    }catch(e){}
    this.cachedCallback.call(this.parent);
}
	
/***
 * ironsugar.prototype.initTimer
 *
 * This function inits the timer that will be used
 * for keeping alive SugarCRM session.
 * 
 */
ironsugar.prototype.initTimer = function() {
	
		// Check every minute session is still alive...
		var o = this;
		window.setTimeout(function() { 
			o.getUserId.call(o);
		},60000);
}

/***
 * ironsugar.prototype.keepalive
 *
 * Callback function of internal timer that sends a
 * login method to avoid SugarCRM session expire.
 * 
 * @param response	Response JSON data from SugarCRM 
 * 
 */
ironsugar.prototype.keepalive = function(response) {
	try{
		var id = eval(response.text);
		this.parent._checkAtt();
	}catch(e){}

	if (id != this.uid) {
		this.sessid = false;
		this.parent._checkAuth();
		return;	
	}
	if (this.stopTimer) {
		this.stopTimer = false;
		this.parent._login();
		return;	
	}

	this.initTimer();

}

/***
 * ironsugar.prototype.login
 *
 * This function sends a login request to Sugarcrm
 * 
 * @params Callback Function
 * 
 */
ironsugar.prototype.login = function(callback) {
	this.cachedCallback = callback;
	this._callREST("login",'[{"password":"'+this.pass+'","user_name":"'+this.user+'"},"'+this.application+'",[]]',this.postlogin);
	return;
};

/***
 * ironsugar.prototype.postOp
 *
 * This function acts as a generic callback that checks
 * JSON response and actually calls cachedCallback attribute
 * 
 * @param response	Response JSON data from SugarCRM 
 * 
 */
ironsugar.prototype.postOp = function(response) {
	try{
		var j = eval("("+response.text + ")");
	}catch(e){}
	this.cachedCallback.call(this.parent,j);
};

/***
 * getContactsFromMail
 * Get Contact information from an email address
 * CAUTION: More than one contact can share the same email address 
 *
 * @param email 	Email used to fetch contact data
 * @param callback	Callback function after feching data
 ***/
ironsugar.prototype.getContactsFromMail = function(email, callback){
        this.cachedCallback = callback;
        var q = "contacts.id in (select eabr.bean_id from email_addresses ea left join email_addr_bean_rel eabr on eabr.email_address_id=ea.id where ea.email_address like '%"+email+"%')";
        this._callREST("get_entry_list",'["'+this.sessid+'","Contacts","'+q+'","",0,["id","first_name","last_name"],"[]",100,"false"]',this.postOp);
        return true;
}

/**
 * getInfoFromContact
 * Get Relationships from a contact 
 * @param contactID	ContactID to fetch relationships
 * @param callback	Callback function after feching data
 **/ 
ironsugar.prototype.getInfoFromContact = function(contactID,callback) {
	this.cachedCallback = callback;
	var q = "contacts.id in (select c.id from contacts c where c.id = '"+contactID+"')"; 
	var _r = [];
	if (this.parent.getUserPropertyInfo("my_zsugar_opportunities").value == "true") _r.push('{"name":"opportunities", "value":["id", "name"]}'); 
	if (this.parent.getUserPropertyInfo("my_zsugar_project").value == "true") _r.push('{"name":"project", "value":["id", "name"]}');
	if (this.parent.getUserPropertyInfo("my_zsugar_accounts").value == "true") _r.push('{"name":"accounts", "value":["id", "name"]}');
	if (this.parent.getUserPropertyInfo("my_zsugar_leads").value == "true") _r.push('{"name":"leads", "value":["id", "first_name", "last_name"]}');
	if (this.parent.getUserPropertyInfo("my_zsugar_cases").value == "true") _r.push('{"name":"cases", "value":["id", "name"]}');
	if (_r.length == 0) return false;
	var r = '['+_r.join(',')+']';
	this._callREST("get_entry_list",'["'+this.sessid+'","Contacts","'+q+'","",0,["id","first_name","last_name"],'+r+',2,"false"]',this.postOp);	
	return true;
};

/***
 * ironsugar.prototype.getUserId
 *
 * This function sends a get_user_id request to Sugarcrm
 * 
 * @params Callback Function
 * 
 */
ironsugar.prototype.getUserId = function() {
	this._callREST("get_user_id",'["'+this.sessid+'"]',this.keepalive);
};


/***
 * ironsugar.prototype.saveEmail
 *
 * This function creates a new Email in SugarCRM.
 * Steps:
 *  - Get zimbra email addresses
 *  - Get zimbra email dates
 *  - Parse HTML + Plaintext body
 *  - Create Rest data structure 
 * 
 * @param msg		Zimbra Email
 * @param subject 	Email Subject (Can be updated by user)
 * @param callback	Callback Function after creating the email
 * 
 */
ironsugar.prototype.saveEmail = function(msg,subject,callback) {
	this.cachedCallback = callback;

	var _addrs = ("FROM,TO,CC").split(",");
	var addrs = {FROM:[],TO:[],CC:[]};
	
	for (var j = 0;j<_addrs.length;j++) {
	 	var list =  msg._addrs[_addrs[j]]['_array'];
		for (var k=0;k<list.length;k++) {
			addrs[_addrs[j]].push(list[k]['address']);
		}
	}
	

	var ff = new Date(msg.sentDate);
	var dateSent = ff.getFullYear()+"-"+pad((ff.getMonth()+1),2)+"-"+pad(ff.getDate(),2)+' '+ pad(ff.getHours(),2)+":"+pad(ff.getMinutes(),2)+":"+pad(ff.getSeconds(),2);

	var body_html = msg.getBodyContent();
        if (!body_html) body_html="";
        body_html = body_html.replace(/\r\n/g,"<br>");
        body_html = body_html.replace(/\n/g, "");
        body_html = this.EscapeJSON(body_html);
        body_html = body_html.replace(/&quot;/g,"\\\"");

/*
	var body = msg.getTextPart();
        if (!body) body = "";
	if (msg.getBodyPart(ZmMimeTable.TEXT_HTML)) {	
		var div = document.createElement("div");
		div.innerHTML = msg.getBodyPart(ZmMimeTable.TEXT_HTML).content;
		body = AjxStringUtil.convertHtml2Text(div);
	}
        body = this.EscapeJSON(body);
        */
        var body = body_html;
	
	var d = '['+
		'{"name":"assigned_user_id", "value":"'+this.uid+'"},'+
		'{"name":"created_by", "value":"'+this.uid+'"},'+
		'{"name":"from_addr", "value":"'+addrs['FROM'].join(", ")+'"},'+
		'{"name":"to_addrs", "value":"'+addrs['TO'].join(", ")+'"},'+
		'{"name":"cc_addrs", "value":"'+addrs['CC'].join(", ")+'"},'+
		'{"name":"description_html", "value":"'+body_html+'"},'+
		'{"name":"description", "value":"'+body+'"},'+
		'{"name":"date_sent", "value":"'+dateSent+'"},'+
                '{"name":"date_entered", "value":"'+dateSent+'"},'+
                '{"name":"date_modified", "value":"'+dateSent+'"},'+
		'{"name":"status", "value":"archived"},'+
		'{"name":"type", "value":"archived"},'+
		'{"name":"name", "value":"'+subject+'"}]';
			
	this._callREST("set_entry",'["'+this.sessid+'","Emails",'+d+']',this.postOp);
	
	return true;
};

/***
 * ironsugar.prototype.LinkEmail
 *
 * This function creates a relationship between a SugarCRM Email and 
 * selected Opportunities, Projects, Accounts, Contacts, Cases and
 * Leads.
 * So, there should be 0..N set_relationship requets for each
 * saved Mail
 * 
 * @param idMail	SugarCRM Email ID
 * @param arMod 	Selected items
 * @param callback	Callback Function after creating the email
 * 
 */
ironsugar.prototype.LinkEmail = function(idMail,arMod,callback) {
	this.cachedCallback = callback;
		
	var items = ['opportunities','project','accounts', 'contacts', 'leads', 'cases'];
	
	for(var i in items) {
		for (var j in arMod[items[i]]) {
			var idItem = arMod[items[i]][j];
			this._callREST("set_relationship",'["'+this.sessid+'","Emails","'+idMail+'","'+items[i]+'","'+idItem+'",[],0]',this.postOp);
		}
	}

	return true;
};	

/***
 * ironsugar.prototype.setAttachment
 *
 * This function creates an Attachment in SugarCRM through a
 * set_note_attachment method. Attachments are always linked
 * to an email.
 * 
 * @param msgId		SugarCRM Email ID
 * @param fname 	Attachment Name
 * @param url		URL to fetch attachment binary data 
 * @param callback	Callback Function after creating the email
 * 
 */
ironsugar.prototype.setAttachment = function(msgId,fname,url, callback) {
//        this.cachedCallback = callback;
	
	var note = '{'+
	    	   '"id":"'+msgId+'",'+
	       	   '"filename":"'+fname+'",'+
           	   '"file":"'+url+'",'+
                   '"related_module_id":"'+msgId+'",'+
                   '"related_module_name":"Emails"}';

	this._callREST("set_note_attachment",'["'+this.sessid+'",'+note+']', this.postAttach,fname,callback);
};

/***
 * ironsugar.prototype.updateAttachment
 *
 * This function update name and description of an attachment
 * 
 * @param idAttach	SugarCRM Attachment ID
 * @param filename	Attachment name and description
 * 
 */
ironsugar.prototype.updateAttachment = function(idAttach, filename) {	

       	var d = '['+
               	'{"name":"id", "value":"'+idAttach+'"},'+
                '{"name":"name", "value":"'+filename+'"},'+
       	        '{"name":"description", "value":"'+filename+'"}]';

       	this._callREST("set_entry",'["'+this.sessid+'","Emails",'+d+']',this.postOp);
};


/***
 * ironsugar.prototype.postAttach
 *
 * Callback function created after creating an attachment
 * 
 */
ironsugar.prototype.postAttach = function(fname,callback, response) {
    try{
	       var j = eval("("+response.text + ")");
    }catch(e){}
    callback.call(this.parent,fname,j);
};


/***
 * ironsugar.prototype.saveAppointment
 *
 * This function creates an Appointment in SugarCRM through a
 * set_entry  method. 
 * 
 * @param appt		Appointment data
 * @param subject	Appointment subject (Can be changed by user)
 * @param callback	Callback Function after creating the email
 * 
 */
ironsugar.prototype.saveAppointment = function(appt, subject, callback) {
	this.cachedCallback = callback;

	var addrs = [];

	for (var j = 0;j< appt.origAttendees.length;j++) {
                addrs.push(appt.origAttendees[j].getAttr("email"));
	}

	var start = new Date(appt.startDate);
	var dateStart = start.getFullYear()+"/"+(start.getMonth()+1)+"/"+start.getDate()+' '+ start.getHours()+":"+start.getMinutes()+"::"+start.getSeconds();
        var end = new Date(appt.endDate);
        var dateEnd = end.getFullYear()+"/"+(end.getMonth()+1)+"/"+end.getDate()+' '+ end.getHours()+":"+ end.getMinutes()+"::"+end.getSeconds();

	var d = '['+
		'{"name":"created_by", "value":"'+ this.uid +'"},'+
		'{"name":"assigned_user_id", "value":"'+ this.uid +'"},'+
		'{"name":"location", "value":"'+ appt.location +'"},'+
		'{"name":"description", "value":""},'+
		'{"name":"date_start", "value":"'+dateStart+'"},'+
		'{"name":"date_end", "value":"'+dateEnd+'"},'+
		'{"name":"name", "value":"'+ subject +'"}]';
			
	this._callREST("set_entry",'["'+this.sessid+'","Meetings",'+d+']',this.postOp);
	
	return true;
};

/***
 * ironsugar.prototype.LinkAppt
 *
 * This function creates a relationship between a SugarCRM Appointment  
 * and selected Opportunities, Projects, Accounts, Contacts, Cases and
 * Leads.
 * 
 * @param idAppt	SugarCRM Attachment ID
 * @param arMod 	Selected items
 * @param callback	Callback Function after creating the email
 * 
 */
ironsugar.prototype.LinkAppt = function(idAppt,arMod,callback) {
        this.cachedCallback = callback;

        var items = ['opportunities','project','accounts', 'contacts', 'leads', 'cases'];

        for(var i in items) {
                for (var j in arMod[items[i]]) {
                        var idItem = arMod[items[i]][j];
                        this._callREST("set_relationship",'["'+this.sessid+'","Meetings","'+idAppt+'","'+items[i]+'","'+idItem+'",[],0]',this.postOp);
                }
        }

        return true;
};

/***
 * ironsugar.prototype.EscapeJSON
 *
 * This function escapes string to avoid breaking JSON parsing.
 * 
 * @param s             Original String to be escaped
 * @returns             Escaped String JSON compilant
 * 
 */
ironsugar.prototype.EscapeJSON = function(s){ 

    if( s==null ) return null; 

    var sb = [];
    for(var i=0; i< s.length ;i++){ 
        var ch = s.charAt(i); 
        switch(ch){ 
          case '"': 
              sb.push("\\\""); 
              break; 
          case '\\': 
              sb.push("\\\\"); 
              break; 
          case '\b': 
              sb.push("\\b"); 
              break; 
          case '\f': 
              sb.push("\\f"); 
              break; 
          case '\n': 
              sb.push("\\n"); 
               break; 
          case '\r': 
              sb.push("\\r"); 
              break; 
          case '\t': 
              sb.push("\\t"); 
              break; 
          case '/': 
               sb.push("\\/"); 
               break; 
          default:
                sb.push(ch);
        }
        
    }//for 

    return sb.join(""); 
   
};


function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }

    return str;

}
