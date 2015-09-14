## omegle-textchat
Never use the browser for omegle textchats again!

## Install
  npm install omegle-textchat

## Example
```javascript
  var omegle = new Omegle();
  
  omegle.connect(function(err) {
    if ( err ) {
      console.log(err);
      return;
    }
    console.log('omegle connected.');
  });

  omegle.on('typing', function() {
    console.log('Stranger is typing.');
  });
  
  omegle.on('gotMessage', function(msg) {
    console.log('Stranger said: ' + msg);
    
    setTimeout(function() {
      omegle.say('hello', function(err) {
        if ( err ) { console.log(err); 
      });
    }, 1000);  
  });
```
  See example.js for more.

## Manual
```javascript
  Methods:
    # disconnect the chat with current stranger
    omegle.disconnect(done)
    
    # indicate that you have started typing
    omegle.typing(done)
  
    # indicate that you have stopped typing
    omegle.stoppedtyping(done)
  
    # Say something to the stranger
    omegle.say(msg, done);

  Emitters:
    on('gotMessage', function(msg))
    on('typing', function())
    on('stoppedTyping', function())
    on('error', function(err))
    on('unhandledEvent', function(eventRaw))
    on('strangerDisconnected', function())
```
## License
GPLv3
