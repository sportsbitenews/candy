var express = require('express');
var app = express();

app.use('/', express.static(__dirname));

var port = process.env.PORT || 3000;
server = app.listen(port, function () {
    console.log('Server listening on port %d in %s mode.', server.address().port, app.settings.env);
});
