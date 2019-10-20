'use strict';

var Collections = (function() {

  function Collections(config) {
    var defaults = {
      "el": "#sequencer",
      "collectionId": "ia_fedflixnara_us_information_agency",
      "metadataDir": "/data/metadata/",
      "sampledataDir": "/data/sampledata/",
      "audioDir": "./audio/collections/",
      "sampleItemKey": "sourceFilename",
      "itemKey": "filename",
      "gain": -3,
      "onChange": function(){},
      "onDataLoaded": function(){}
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Collections.prototype.init = function(){
    // subdivision in milliseconds
    this.beatMs = 1000;
    this.subdivision = this.beatMs / 16.0;
    this.maxSubdivisions = 8;
    this.minSubdivisions = 1;
  };

  Collections.prototype.load = function(){
    var _this = this;
    var deferred = $.Deferred();

    $.when(
      $.getJSON(this.opt.metadataDir + this.opt.collectionId + '.json'),
      $.getJSON(this.opt.sampledataDir + this.opt.collectionId + '.json')

    ).done(function(metadata, sampledata){
      metadata = metadata[0];
      sampledata = sampledata[0];

      console.log('Metadata and sample data loaded.');
      _this.onDataLoaded(metadata, sampledata);
      deferred.resolve();
    });

    return deferred;
  };

  Collections.prototype.loadListeners = function(){
    var _this = this;

    this.$itemSelect.on('change', function(e){
      _this.onItemChange(parseInt($(this).val()));
    });
  };

  Collections.prototype.loadTrackData = function(){
    var _this = this;
    var tracks = {};
    var sampleIndex = this.sampleIndex;
    var samples = this.item.samples;
    var col = 0;
    while(col < 16) {
      var sample = samples[sampleIndex];
      var pattern = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      pattern[col] = 1;
      tracks[sample.id] = {
        "pattern": pattern,
        "url": sample["url"],
        "title": this.item.title + ' (' + sample.title + ')',
        "type": "collection",
        "gain": _this.opt.gain
      };
      var nearestSubdivisions = Math.floor(sample.dur / this.subdivision);
      nearestSubdivisions = MathUtil.clamp(nearestSubdivisions, this.minSubdivisions, this.maxSubdivisions);
      col += nearestSubdivisions;
      sampleIndex += 1;
      if (sampleIndex >= samples.length) sampleIndex = 0;
    }

    // console.log(tracks)
    this.tracks = tracks;
  };

  Collections.prototype.loadUI = function(){
    var _this = this;
    this.$el = $(this.opt.el);

    // load item select
    var $itemSelect = this.$el.find(".select-item");
    $itemSelect.empty();
    var html = '';
    _.each(this.items, function(item, index){
      var selected = '';
      if (index === _this.itemIndex) selected = ' selected';
      html += '<option value="'+index+'"'+selected+'>'+item.title+'</option>';
    });
    $itemSelect.html(html);
    this.$itemSelect = $itemSelect;
  };

  Collections.prototype.onDataLoaded = function(metadata, sampledata){
    this.parseData(metadata, sampledata);
    this.loadTrackData();
    this.opt.onDataLoaded();
    this.loadUI();
    this.loadListeners();
  };

  Collections.onItemChange = function(index){};

  Collections.prototype.parseData = function(metadata, sampledata){
    // parse samples
    var _this = this;
    var sampleHeadings = sampledata.itemHeadings;
    var samples = _.map(sampledata.items, function(sample){
      var sampleObj = _.object(sampleHeadings, sample);
      sampleObj.title = MathUtil.secondsToString(sampleObj.sourceStart/1000.0);
      sampleObj.url = _this.opt.audioDir + _this.opt.collectionId + '/' + sampleObj.id + '.mp3';
      return sampleObj;
    });
    // create a lookup table
    var sampleLookup = _.groupBy(samples, this.opt.sampleItemKey);

    // parse items
    var itemHeadings = metadata.itemHeadings;
    var items = _.map(metadata.items, function(item){
      var itemObj = _.object(itemHeadings, item);
      var itemKey = ''+itemObj[_this.opt.itemKey];
      if (itemObj.year !== '' && !itemObj.title.endsWith(')')) itemObj.title += ' ('+itemObj.year+')';
      itemObj.samples = _.has(sampleLookup, itemKey) ? _.sortBy(sampleLookup[itemKey], 'sourceStart') : [];
      return itemObj;
    });
    items = _.filter(items, function(item){ return item.samples && item.samples.length > 1; });
    items = _.sortBy(items, 'title');
    this.items = items;
    this.itemIndex = _.random(0, this.items.length-1);
    this.item = this.items[this.itemIndex];
    this.sampleIndex = _.random(0, this.item.samples.length-1);
    // console.log(this.item.samples)
  };

  return Collections;

})();