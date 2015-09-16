var Omegle = require('./index.js')
, omegle = new Omegle();

// Holds the amount of messages received, so we can know when to respond 
// differently (for the sake of example)
var msgCount = 0;

// Replies to stranger
function say(msg) {
  setTimeout(function() {
    omegle.say(msg, function(err) {
      if ( err ) {
        console.log('Say error: ' + err);
        return;
      }
    
      console.log('replied with: ' + msg);
    });
  }, 1000);
}

// Instantiate a chat session
omegle.connect(function(err) {
  if ( err ) {
    console.log(err);
    return;
  }
  console.log('omegle connected.');
});

// Handle events accordingly...
omegle.on('gotMessage', function(msg) {
  // Increment the message counter
  msgCount += 1;

  // Log what the stranger said so we can read it
  console.log('Stranger said: ' + msg);
  
  // Ask them if they are a bot, then start repeating what they say as a 
  // question in all caps.
  if ( msgCount === 1 ) {
    say('hey are u a bot?');
  }
  else {
    say(msg.toUpperCase() + '?');  
  }
});

omegle.on('stoppedTyping', function() {
  console.log('Stranger stopped typing');
});

omegle.on('typing', function() {
  console.log('Stranger is typing.');
});

omegle.on('strangerDisconnected', function() {
  console.log('stranger disconnected.');
});

omegle.on('unhandledEvent', function(event) {
  console.log('unhandledEvent=' + event);
});

omegle.on('error', function(err) {
  console.log(err);
});
