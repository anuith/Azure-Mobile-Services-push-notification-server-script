/*
By Thiwakorn Faengrit and Panupong Sritananun
We used this in our work and just want to share.
*/
var CHANNEL_TABLE_NAME = "Channels";
var _request;
var count = 0;
var deleteQueue = [];
var now = Date.now();

function insert(item, user, request) {
    _request = request;
    item.timestamp = new Date().toLocaleString();
    request.execute({
        success: function () {
            sendNotifications(item);
        }
    });
}

function sendNotifications(item) {
    var channelTable = tables.getTable(CHANNEL_TABLE_NAME);
    channelTable.read({
        success: function (channels) {
            for (count = 0; count < channels.length; count++) {
                var channel = channels[count];
                var expires = Date.parse(channel.expires);
                if (expires < now) {
                    deleteQueue.push(channel.id);
                    console.warn("Channel expired and will be deleted: {\n\tid:\"%d\",\n\turi:\"%s\"\n}", channel.id, channel.uri);
                } else {
                    push.wns.sendTileWideImageAndText01(channel.uri, {
                        text1: item.title,
                        image1src: newsItem.image
                    }, {
                        success: response.bind({ isLastChannel: isLastChannel }),
                        error: errorFn.bind({ channel: channel, isLastChannel: isLastChannel })
                    })
                }
            }
        }
    });
}

function response(pushResponse) {
    if (this.isLastChannel) {
        deleteExpiredChannels();
        console.log("Send push notifications finished");
        _request.respond(200, "Push successful");
    }
}

function errorFn(ex) {
    if (ex.statusCode === 410 && ex.toString().indexOf("channel expired") != -1) {
        deleteQueue.push(this.channel.id);
        console.warn("Channel expired and will be deleted: {\n\tid:\"%d\",\n\turi:\"%s\"\n}", this.channel.id, this.channel.uri);
    } else {
        console.error(ex.toString(), this.channel.id);
    }

    if (this.isLastChannel) {
        deleteExpiredChannels();
        console.log("Send push notifications finished");
        _request.respond(200, "Push successful");
    }
}

function deleteExpiredChannels() {
    if (deleteQueue.length > 0) {
        var length = deleteQueue.length;
        var sql = 'DELETE FROM ' + CHANNEL_TABLE_NAME + ' WHERE id IN (' + deleteQueue.join(',') + ')';
        mssql.query(sql, {
            success: function () {
                console.log("Deleted %d expired channels", length);
            }
        });
        deleteQueue = [];
    }
}