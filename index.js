var needle = require('needle')
    , random_ua = require('random-ua')
    , EventEmitter = require('events').EventEmitter;

var USERAGENT = random_ua.generate()
// Omegle chat servers
    , SERVERS = [
  'front1.omegle.com', 'front2.omegle.com', 'front3.omegle.com',
  'front4.omegle.com', 'front5.omegle.com', 'front6.omegle.com',
  'front7.omegle.com', 'front8.omegle.com', 'front9.omegle.com'
]
// Omegle's API endpoints
    , API = {
  events: '/events',
  status: '/status',
  stoppedTyping: '/stoppedtyping',
  typing: '/typing',
  disconnect: '/disconnect',
  start: '/start',
  send: '/send'
};

// Get a random server from the SERVERS array
function getRandomServer() {
  return SERVERS[Math.floor(Math.random() * SERVERS.length)];
}

// Get a randid for Omegle
function getRandomId() {
  var randIdChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ', id = '';

  while ( id.length < 8 ) {
    id += randIdChars[Math.floor(Math.random() * randIdChars.length)];
  }

  return id;
}

// Send either a GET or POST request for interacting with the Omegle API
function request(url, method, post, done) {
  var options = {timeout: 5000};

  if ( typeof url !== 'string' ) {
    throw new Error('Supplied url was not a string!');
  }

  if ( typeof method !== 'string' ) {
    throw new Error('Supplied method was not a string!');
  }

  if ( ! /^(?:get|post)$/i.test(method) ) {
    throw new Error('Supplied method must be GET or POST!');
  }

  if ( !done ) {
    done = post;
  }

  function requestCallback(err, res, body) {
    var error;

    if ( err ) {
      return done(err);
    }
    else if ( res.statusCode !== 200 ) {
      return done(new Error('statusCode not 200, got: ' + res.statusCode));
    }
    else if ( !body ) {
      // We mark these errors as 'no log' because the event page from 
      // omegle often returns nobody. This is so we have an indicator 
      // for errors that can be potentially ignored.
      error = new Error('No body received from request!');
      error.nolog = true;
      return done(error);
    }

    done(null, body);
  }

  needle.defaults({user_agent: USERAGENT});

  //console.log(method.toUpperCase() + ' "' + url + '"');

  if ( method.toLowerCase() === 'get' ) {
    needle.get(url, options, requestCallback);
  }
  else {
    needle.post(url, post, options, requestCallback);
  }
}

function Omegle(config) {
  EventEmitter.call(this);

  config = config || {};

  // Topics
  this.topics = config.topics;

  // The status interval that runs.
  this.statusInterval = null;
  this.statusDelay = 25000; //milliseconds

  // Max time we wait for a message before killing interval.
  this.maxIdle = config.maxIdle || 50000; // milliseconds
  // the randid for the current chat
  this.randId = '';
  // the omegle host server for the current chat
  this.host = '';
  // the clientid for the current chat
  this.clientId = '';

  return this;
}

// Inherit eventemitter prototype
Omegle.prototype = Object.create( EventEmitter.prototype );

// This requests the /events page of Omegle and handles the given
// events accordingly. Passes events along to user via emitter.
Omegle.prototype.captureEvents = function() {
  var self = this
      , reqInterval
      , intervalDelay = 2500 // milliseconds
      , idleTime = 0 // milliseconds
      , eventUrl = 'http://' + this.host + API.events;

  function handleEventResponse(err, json) {
    var eventType = null;
    // No log errors presumably do not need to be viewed due to
    // anticipated blank body responses from omegle for the /event page.
    // However should this API start failing, it might be a good idea
    // to see what these messages are.
    if ( err && !err.nolog ) {
      self.emit('error', err);
      return;
    }

    // Omegle events as of sept-13-2015 come in a multidimensional array.
    // The first index of the inner array is a label of the type of
    // data received. Known event types:
    //  gotMessage (with next of array being the msg)
    //  typing (indicates peer is typing)
    //  stoppedTyping (indicates peer stopped typing)
    //  strangerDisconnected
    if ( Array.isArray(json) && Array.isArray(json[0]) ) {
      eventType = json[0][0];
    }

    // Handle the event type appropriately.
    if ( eventType === 'gotMessage' ) {
      idleTime = 0;
      self.emit('gotMessage', json[0][1]);
    }
    else if ( eventType === 'typing' ) {
      idleTime = 0;
      self.emit('typing', 'Strange is typing');
    }
    else if ( eventType === 'strangerDisconnected' ) {
      // When the stranger disconnects, we clear the interval.
      clearInterval(reqInterval);
      // We also clear the status interval that occasionally sends.
      if ( self.statusInterval ) {
        clearInterval(self.statusInterval);
      }
      // Finally we emit that the stranger has connected
      self.emit('strangerDisconnected', 'Strange disconnected.');
    }
    else if ( eventType === 'stoppedTyping' ) {
      self.emit('stoppedTyping', 'Stranger stopped typing.');
    }
    else if ( eventType ) {
      self.emit('unhandledEvent', json);
    }
    else {
      idleTime += intervalDelay;
    }
  }

  // This function requests the event page on Omegle via
  // an interval until it is cleared by the stranger disconnecting.
  function requestEventUrl() {
    // Handle excess idle time by clearing interval and disconnecting chat.
    if ( idleTime > self.maxIdle ) {
      clearInterval(reqInterval);

      if ( self.statusInterval ) {
        clearInterval(self.statusInterval);
      }

      return self.disconnect(function(err) {
        if ( err ) {
          self.emit('idleDisconnect', err);
          return;
        }

        self.emit('idleDisconnect');
      });
    }

    request(eventUrl, 'post', {id: self.clientId}, handleEventResponse);
  }

  reqInterval = setInterval(requestEventUrl, intervalDelay);
};

Omegle.prototype.statusSender = function() {
  var self = this;

  function sendStatus() {
    var sendUrl;

    sendUrl = 'http://' + self.host + API.status + '?nocache=' +
        Math.random() + '&randid=' + self.randId;

    request(sendUrl, 'get', function(err) {
      if ( err ) {
        self.emit('error', err);
        return;
      }
    });
  }

  this.statusInterval = setInterval(sendStatus, self.statusDelay);
};

Omegle.prototype.stoppedtyping = function(done) {
  var self = this, sendUrl, post;

  post = {id: this.clientId};
  sendUrl = 'http://' + this.host + API.stoppedTyping;

  request(sendUrl, 'post', post, function(err) {
    if ( err ) {
      self.emit('error', err);
      return done(err);
    }

    done();
  });
};

Omegle.prototype.typing = function(done) {
  var self = this, sendUrl, post;

  post = {id: this.clientId};
  sendUrl = 'http://' + this.host + API.typing;

  request(sendUrl, 'post', post, function(err) {
    if ( err ) {
      self.emit('error', err);
      return done(err);
    }

    done();
  });
};

Omegle.prototype.disconnect = function(done) {
  var self = this, sendUrl, post;

  post = {id: this.clientId};
  sendUrl = 'http://' + this.host + API.disconnect;

  request(sendUrl, 'post', post, function(err) {
    if ( err ) {
      self.emit('error', err);
      return done(err);
    }

    done();
  });
};

// Send a message to user
Omegle.prototype.say = function(msg, done) {
  var self = this, sendUrl, post;

  if ( !msg || typeof msg !== 'string' ) {
    return done(new Error('msg must be a string!'));
  }

  post = {id: this.clientId, msg: msg};
  sendUrl = 'http://' + this.host + API.send;

  //console.log('post: ' + JSON.stringify(post));
  request(sendUrl, 'post', post, function(err) {
    if ( err ) {
      self.emit('error', err);
      return done(err);
    }

    done();
  });
};

// This initiates a chat on Omegle with the main objective to capture
// the clientID from the /start page on Omegle. We give a callback
// of an error if anything goes wrong. Or an empty callback if successful.
// Initiates the capturing of events to maintain status of the initiated chat.
Omegle.prototype.connect = function(done) {
  var self = this, startUrl;

  // Get a randid value for the randid parameter of the url below.
  this.randId = getRandomId();
  // Select a random Omegle chatserver for the url below.
  this.host = getRandomServer();

  if(self.topics.length > 0) {
    startUrl = 'http://' + this.host + API.start + '?rcs=1' +
        '&firstevents=1&spid=&randid=' + this.randId + '&lang=en&topics=[' + self.topics + ']';
  } else {
    startUrl = 'http://' + this.host + API.start + '?rcs=1' +
        '&firstevents=1&spid=&randid=' + this.randId + '&lang=en';
  }


  console.log(startUrl);

  // Request the start page and handle response accordingly, 
  // finally initiating the capturing of events if successful.
  request(startUrl, 'get', function(err, json) {
    if ( err ) {
      return done(err);
    }
    else if ( typeof json !== 'object' ) {
      return done(new Error('Got an unexpected response from ' + API.start));
    }
    else if ( !json.clientID ) {
      return done(new Error(API.start + ' API did not provide clientID'));
    }

    self.clientId = json.clientID;
    self.statusSender();
    self.captureEvents();
    done();
  });
};

module.exports = Omegle;
