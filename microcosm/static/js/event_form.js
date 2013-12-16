/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */
L.Google = L.Class.extend({
  includes: L.Mixin.Events,

  options: {
    minZoom: 0,
    maxZoom: 18,
    tileSize: 256,
    subdomains: 'abc',
    errorTileUrl: '',
    attribution: '',
    opacity: 1,
    continuousWorld: false,
    noWrap: false,
  },

  // Possible types: SATELLITE, ROADMAP, HYBRID
  initialize: function(type, options) {
    L.Util.setOptions(this, options);

    this._type = google.maps.MapTypeId[type || 'SATELLITE'];
  },

  onAdd: function(map, insertAtTheBottom) {
    this._map = map;
    this._insertAtTheBottom = insertAtTheBottom;

    // create a container div for tiles
    this._initContainer();
    this._initMapObject();

    // set up events
    map.on('viewreset', this._resetCallback, this);

    this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
    map.on('move', this._update, this);
    //map.on('moveend', this._update, this);

    this._reset();
    this._update();
  },

  onRemove: function(map) {
    this._map._container.removeChild(this._container);
    //this._container = null;

    this._map.off('viewreset', this._resetCallback, this);

    this._map.off('move', this._update, this);
    //this._map.off('moveend', this._update, this);
  },

  getAttribution: function() {
    return this.options.attribution;
  },

  setOpacity: function(opacity) {
    this.options.opacity = opacity;
    if (opacity < 1) {
      L.DomUtil.setOpacity(this._container, opacity);
    }
  },

  _initContainer: function() {
    var tilePane = this._map._container
      first = tilePane.firstChild;

    if (!this._container) {
      this._container = L.DomUtil.create('div', 'leaflet-google-layer leaflet-top leaflet-left');
      this._container.id = "_GMapContainer";
    }

    if (true) {
      tilePane.insertBefore(this._container, first);

      this.setOpacity(this.options.opacity);
      var size = this._map.getSize();
      this._container.style.width = size.x + 'px';
      this._container.style.height = size.y + 'px';
      this._container.style.zIndex = 0;
    }
  },

  _initMapObject: function() {
    this._google_center = new google.maps.LatLng(0, 0);
    var map = new google.maps.Map(this._container, {
        center: this._google_center,
        zoom: 0,
        mapTypeId: this._type,
        disableDefaultUI: true,
        keyboardShortcuts: false,
        draggable: false,
        disableDoubleClickZoom: true,
        scrollwheel: false,
        streetViewControl: false
    });

    var _this = this;
    this._reposition = google.maps.event.addListenerOnce(map, "center_changed",
      function() { _this.onReposition(); });

    map.backgroundColor = '#ff0000';
    this._google = map;
  },

  _resetCallback: function(e) {
    this._reset(e.hard);
  },

  _reset: function(clearOldContainer) {
    this._initContainer();
  },

  _update: function() {
    this._resize();

    var bounds = this._map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    var google_bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.lat, sw.lng),
      new google.maps.LatLng(ne.lat, ne.lng)
    );
    var center = this._map.getCenter();
    var _center = new google.maps.LatLng(center.lat, center.lng);

    this._google.setCenter(_center);
    this._google.setZoom(this._map.getZoom());
    //this._google.fitBounds(google_bounds);
  },

  _resize: function() {
    var size = this._map.getSize();
    if (this._container.style.width == size.x &&
        this._container.style.height == size.y)
      return;
    this._container.style.width = size.x + 'px';
    this._container.style.height = size.y + 'px';
    google.maps.event.trigger(this._google, "resize");
  },

  onReposition: function() {
    //google.maps.event.trigger(this._google, "resize");
  }
});



/////////
// MAP //
/////////
(function(){

  var EventFormMap = (function(){

    var eventFormMap = function(opts){

      // reference to map marker
      this.marker = [];

      // container element
      this.el = null;
      if (typeof opts.el !== 'undefined'){
        if (typeof opts.el == 'string'){
          this.el  = opts.el;
          this.$el = $(this.el);
        }else{
          this.$el = opts.el;
          this.el = this.$el[0];
        }
      }

      // maps cordinates to <input>s
      this.mappings = {
        'lat'   : { el : 'input[name=lat]',   value : null },
        'lng'   : { el : 'input[name=lon]',   value : null },
        'north' : { el : 'input[name=north]', value : null },
        'south' : { el : 'input[name=east]',  value : null },
        'east'  : { el : 'input[name=south]', value : null },
        'west'  : { el : 'input[name=west]',  value : null }
      };

      if (typeof opts.mappings !== 'undefined'){
        this.mappings = $.extend({}, this.mappings, opts.mappings);
      }

      this.map = L.map( 'map-canvas' , { zoomAnimation : false })
                  .setMaxBounds([[-90,-180],[90,180]]); // Restrict map to valid lat:lng pairs

      var googleLayer = new L.Google('ROADMAP');
      this.map.addLayer(googleLayer);

      var cloudmadeLayer = new L.TileLayer("https://d1qte70nkdppk5.cloudfront.net/d6f1a0c60e9746faa7cbfaec4b92dff3/96931/256/{z}/{x}/{y}.png");

      this.map.addControl(new L.Control.Layers({
        'Open Street Map' : cloudmadeLayer,
        'Google Maps'     : googleLayer
        })
      );

      this.bind();

      return this;

    };

    eventFormMap.prototype.clearMarkers = function(){
      if (this.marker.length > 0){
        for(var i=0,j=this.marker.length;i<j;i++){
          this.map.removeLayer(this.marker.pop());
        }
      }
      return this;
    };

    eventFormMap.prototype.addMarker = function(latlng){

      var newMarker = L.marker(latlng);
      this.marker.push(newMarker);

      return this;
    };

    eventFormMap.prototype.renderMarkers = function(){
      if (this.marker.length > 0){
        for(var i=0,j=this.marker.length;i<j;i++){
          this.map.addLayer( this.marker[i] );
        }
      }
      return this;
    };

    eventFormMap.prototype.dropMarker = function(e){

      this.clearMarkers()
          .addMarker(e.latlng)
          .renderMarkers()
          .update(e.latlng)
          .save();

      return this;
    };

    // If this is the edit screen and we need to set the map to known values then
    // we do so here
    // @param lat number
    // @param lng number
    // @param bounds array(array(north, west),array(south, east))
    eventFormMap.prototype.restore = function(lat, lng, bounds){

      this.map.fitBounds(bounds);
      // Bounds will always be 1 level too far out due to imprecision in the
      // numbers and Leaflet aggressively ensuring the bounds fit inside the
      // map area. To prevent us slowly zooming out with each edit, we zoom in
      this.map.zoomIn();

      this.clearMarkers();
      this.addMarker(new L.LatLng(lat, lng));
      this.renderMarkers();

      //assumes form inputs will be prefilled
    };


    eventFormMap.prototype.update = function(latlng){

        // Get the bounds (map box)
        var b  = this.map.getBounds(),
            sw = b.getSouthWest(),
            ne = b.getNorthEast();

        this.mappings['lat'].value    = latlng.lat;
        this.mappings['lng'].value    = latlng.lng;
        this.mappings['north'].value  = ne.lat;
        this.mappings['south'].value  = ne.lng;
        this.mappings['east'].value   = sw.lat;
        this.mappings['west'].value   = sw.lng;

        return this;
    };

    eventFormMap.prototype.save = function(){
      var input;
      for(var i in this.mappings){
        if (typeof this.mappings[i].value !== 'undefined'){
          input = $(this.mappings[i].el);
          if (input.length > 0){
            input.val(this.mappings[i].value);
          }
        }
      }
      return this;
    };

    // resets location inputs, clears markers
    eventFormMap.prototype.reset = function(){

      var input;

      for(var i in this.mappings){
        input = $(this.mappings[i].el);
        if (input.length > 0){
          input.val('');
        }
        this.mappings[i].value = null;
      }

      this.clearMarkers();

      return this;

    };

    eventFormMap.prototype.bind = function(){

      var events = [];

      if (events.length>0){
        for(var i=0,j=events.length;i<j;i++){
          this.$el.on(events[i][0], events[i][1], $.proxy(this[events[i][2]], this) );
        }
      }

      // for map object
      this.map.on('click', $.proxy(this.dropMarker,this) );

    };


    return eventFormMap;

  })();

  window.EventFormMap = EventFormMap;



})();


/**
*   event date and time controls
*/
(function(){
  'use strict';


  var EventDateForm = (function(){

    var EVENT_DATE_TYPE_TBA      = 0,
        EVENT_DATE_TYPE_SINGLE   = 1,
        EVENT_DATE_TYPE_MULTIPLE = 2;


    var eventDateForm = function(opts){

      this.el = false;

      if(typeof opts.el !== "undefined"){
        this.$el = $(opts.el);
        this.el  = this.$el[0];
      }

      // controls
      this.controls = {
        start_calendar            : null,
        start_calendar_start_time : null,
        start_calendar_end_time   : null,
        end_calendar              : null,
        end_calendar_end_time     : null
      };

      var i=0;

      if (typeof opts.controls !== "undefined"){
        for (i in opts.controls){
          this.controls[i] = $(opts.controls[i]);
        }
      }

      this.form = {
        when      : null,
        duration  : null
      };

      if (typeof opts.form !== "undefined"){
        for (i in opts.form){
          this.form[i] = $(opts.form[i]);
        }
      }

      // defaults
      this.startDate = new Date();
      this.endDate   = new Date();

      this.event_date_type = EVENT_DATE_TYPE_SINGLE;

      if (typeof opts.startDate !== "undefined"){
        this.startDate = new Date(opts.startDate);
        this.updateStartTimesUI(getTimeStringFromDate(this.startDate));
      }

      // with duration, we just work out the end date
      // and show "multiple" state if endDate is not on the same day as startDate
      if (typeof opts.duration !== "undefined"){

        var copy_start_date = new Date(this.startDate.getTime());
        copy_start_date.setMinutes(copy_start_date.getMinutes()+parseInt(opts.duration,10));

        this.endDate = new Date(copy_start_date.getTime());

        if( this.endDate.getDate()+""+this.endDate.getMonth()+""+this.endDate.getYear() !==
            this.startDate.getDate()+""+this.startDate.getMonth()+""+this.startDate.getYear()
        ){
          this.event_date_type = EVENT_DATE_TYPE_MULTIPLE;
        }



      }else{
        this.endDate.setHours(this.endDate.getHours()+1);
      }
      this.updateEndTimesUI(getTimeStringFromDate(this.endDate));



      this.controls.start_calendar.date   = new Date(this.startDate.getTime());
      this.controls.end_calendar.date = new Date(this.endDate.getTime());

      this.updateDatePickerUI(this.controls.start_calendar);
      this.updateDatePickerUI(this.controls.end_calendar);


      this.toggleCalendars();

      this.bind();
    };

    // Add a time that is within a string in the format "03:45 PM" onto an existing
    // date object
    function setTime(d, ts) {
      if (!d) {return;}
      var time = ts.match(/(\d?\d):(\d\d)\s(P?)/);
      d.setHours(parseInt(time[1],10) + ((parseInt(time[1],10) < 12 && time[3]) ? 12 : 0));
      d.setMinutes(parseInt(time[2],10) || 0);
    }

    // Given a date object, return the time formatted as "03:45 PM"
    function getTimeStringFromDate(d) {
      var hh = d.getUTCHours();
      var mi = d.getUTCMinutes();
      var pm = (hh > 12);
      return '' + (hh <= 9 ? '0' + hh : (hh > 12 ? hh - 12: hh)) + ':' +
        (mi <= 9 ? '0' + mi : mi) + ' ' +
        (pm ? 'PM' : 'AM');
    }

    // template object for calendar display
    // @param  dateObject - a javascript Date object
    // @return string     - string which will be converted and injected into the dom
    function template(dateObject){

      var d = dateObject,
          locale_days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
          locale_months = [
            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
          ],
          output = "";

      output = '<div class="item-event-date">' +
                 '<span class="item-event-date-digit">' + d.getDate() + '</span>' +
                 '<span class="item-event-date-day">' + locale_days[d.getDay()] +
                   '<strong>'+ locale_months[d.getMonth()] + ' ' + d.getFullYear() + '</strong>' +
                 '</span>' +
               '</div>';

      return output;
    }

    // Not all browsers know how to do toISOString() as it was only added in
    // ECMAScript 5, so we just ship our own version.
    function dateToUtcString(d) {
      function pad(n) { return n < 10 ? '0' + n : n; }
      return d.getUTCFullYear()           + '-' +
             pad(d.getUTCMonth()    + 1)  + '-' +
             pad(d.getUTCDate())    + 'T' +
             pad(d.getUTCHours())   + ':' +
             pad(d.getUTCMinutes()) + ':' +
             pad(d.getUTCSeconds()) + 'Z';
    }

    eventDateForm.prototype.setEventType = function(type){

      this.event_date_type = type;

    };

    eventDateForm.prototype.getStartTime = function(){

      var startTimeControl = "#event-start-calendar-start-time";
      return this.controls.start_calendar_start_time.val().trim();
    };

    eventDateForm.prototype.getEndTime = function(){

      var endTimeControl;

      if (this.event_date_type == EVENT_DATE_TYPE_SINGLE){
        endTimeControl = this.controls.start_calendar_end_time;
      }else if (this.event_date_type == EVENT_DATE_TYPE_MULTIPLE){
        endTimeControl = this.controls.end_calendar_end_time;
      }else{
        console.log('getEndDateTime(): unrecognized event_date_type');
      }

      return endTimeControl.val().trim();
    };

    eventDateForm.prototype.calculateEventDuration = function(){

      var duration,
          startDateTime,
          endDateTime;

      // We can glue them together
      startDateTime = this.startDate;
      setTime(startDateTime, this.getStartTime());

      if (this.event_date_type == EVENT_DATE_TYPE_SINGLE){
        endDateTime = new Date(this.startDate.getTime());
      }else if (this.event_date_type == EVENT_DATE_TYPE_MULTIPLE){
        endDateTime = this.endDate;
      }else{
        console.log('calculateEventDuration(): unrecognized event_date_type');
      }
      setTime(endDateTime, this.getEndTime());

      // To calculate the difference between the dateTimes as an integer
      // representing minutes
      duration = (endDateTime.valueOf() / 60000) - (startDateTime.valueOf() / 60000);

      // And if we've got junk input, default to an hour
      if (!duration || duration < 0) {
        duration = 60;
      }

      return {
        startDateTime : startDateTime,
        endDateTime   : endDateTime,
        duration      : duration
      };

    };

    eventDateForm.prototype.updateEventFormWhenDuration = function(){

      var eventDate,
          eventDateFields;

      eventDate = this.calculateEventDuration();

      eventDateFields = [
        [ this.form.when,     dateToUtcString(eventDate.startDateTime) ],
        [ this.form.duration, eventDate.duration ]
      ];

      for(var i=0,j=eventDateFields.length;i<j;i++){
        eventDateFields[i][0].val(eventDateFields[i][1]);
      }
    };

    eventDateForm.prototype.resetEventFormWhenDuration = function(){

      var eventDateFields;

      eventDateFields = [
        this.form.when,
        this.form.duration
      ];

      for(var i=0,j=eventDateFields.length;i<j;i++){
        eventDateFields[i].val('');
      }
    };


    // events

    // updates event dates for post request
    // @param ev   - expects a specific event object returned by bootstrap-datepicker plugin
    //             - at a minimum { currentTarget: <domelement>, date: <jsDateObject> }
    eventDateForm.prototype.updateEventStartDate = function(ev){

      this.startDate = ev.date;
      this.controls.start_calendar.date = new Date(this.startDate.getTime());

      this.updateEventFormWhenDuration();
      this.updateDatePickerUI(this.controls.start_calendar);
    };

    eventDateForm.prototype.updateEventEndDate = function(ev){

      this.endDate = ev.date;
      this.controls.end_calendar.date = new Date(this.endDate.getTime());

      this.updateEventFormWhenDuration();
      this.updateDatePickerUI(this.controls.end_calendar);
    };

    // handles the UI of the calendar
    // @param ev   - expects a specific event object returned by bootstrap-datepicker plugin
    //             - at a minimum { currentTarget: <domelement>, date: <jsDateObject> }
    eventDateForm.prototype.updateDatePickerUI = function(calendar){
      calendar.datepicker('hide');
      calendar.html(template(calendar.date));
    };

    eventDateForm.prototype.updateStartTimesUI = function(desiredValue){
      this.controls.start_calendar_start_time.val(desiredValue);
    };

    eventDateForm.prototype.updateEndTimesUI = function(desiredValue){
      this.controls.start_calendar_end_time.val(desiredValue);
      this.controls.end_calendar_end_time.val(desiredValue);
    };


    // if..else based on event_date_type
    // _____________   _____________
    // |      x     |  |      z     |
    // |____________|  |____________|
    //
    // [ x ] to [ y ]  [ z ]

    eventDateForm.prototype.toggleCalendars = function(){

          // cache references to the calendar elements we are interested in
      var elements_event_calendars         = this.$el.find('.form-datepicker'),
          elements_event_date_type_single  = this.$el.find('.form-datepicker-single'),
          elements_event_date_type_mutiple = this.$el.find('.form-datepicker-multiple');

      // shows all "x,y", hides all "z"
      if (this.event_date_type == EVENT_DATE_TYPE_SINGLE){
        elements_event_calendars.show();
        elements_event_date_type_single.show();
        elements_event_date_type_mutiple.hide();

        this.updateEventFormWhenDuration();
      }
      // shows all "x,z", hides all "y"
      if (this.event_date_type == EVENT_DATE_TYPE_MULTIPLE){
        elements_event_calendars.show();
        elements_event_date_type_single.hide();
        elements_event_date_type_mutiple.show();

        this.updateEventFormWhenDuration();

        var mutipleStateRadioButton = this.$el.find('#event-date-type-options input[type=radio]').eq(1);
        if (mutipleStateRadioButton.length>0){
          mutipleStateRadioButton[0].checked = "checked";
        }
      }
      // hides "x,y,z"
      if (this.event_date_type == EVENT_DATE_TYPE_TBA){
        elements_event_calendars.hide();

        this.resetEventFormWhenDuration();
      }
    };

    eventDateForm.prototype.onEventDateTypeToggle = function(e){
      var self = $(e.currentTarget);
      this.setEventType(self.val());
      this.toggleCalendars();
    };

    eventDateForm.prototype.bind = function(){


      var events = [
        [ 'change', '#event-date-type-options input[type=radio]', 'onEventDateTypeToggle' ],
        [ 'change', '.event-time',                                'updateEventFormWhenDuration' ]
      ];

      if (events.length>0){
        for(var i=0,j=events.length;i<j;i++){
          this.$el.on(events[i][0], events[i][1], $.proxy(this[events[i][2]], this) );
        }
      }

      this.controls.start_calendar
        .datepicker()
        .on('changeDate', $.proxy(this.updateEventStartDate,this));

      this.controls.end_calendar
        .datepicker()
        .on('changeDate',   $.proxy(this.updateEventEndDate,this));


    };

    return eventDateForm;

  })();

  window.EventDateForm = EventDateForm;

})();


//////////////
// location //
//////////////
(function(){


  /*
  *   location field toggle
  */
  var LOCATION_TYPE_AVAILABLE = 1,
      LOCATION_TYPE_TBA       = 0,
      location_type_options   = $('#location-options input[name=location-type]'),
      form_location           = $('.form-location');

  location_type = LOCATION_TYPE_AVAILABLE;

  function toggleLocation(){
    if (location_type === LOCATION_TYPE_AVAILABLE){
      form_location.show();
    }
    if (location_type === LOCATION_TYPE_TBA){
      form_location.hide();
      if (typeof formMap !== 'undefined'){
        formMap.reset();
        locationControl.find('textarea').val('');
      }
    }
  }

  location_type_options.on('change',function(e){
    var _this = $(e.currentTarget);
    location_type = parseInt(_this.val(),10);
    toggleLocation();
  });


  /*
  *   bind location textbox
  */
  var locationControl = $('#location-control');

  function geoQuery(locationQuery){
    var geoQueryURL = '/geocode/?q=';
    $.ajax({
      url   : geoQueryURL + locationQuery,
      type  : 'GET'
    }).success(geoQueryResult)
      .error(geoQueryError);
  }

  function geoQueryError(error){
    console.log(error);
  }

  function geoQueryResult(data, response, xhr){

    // And if it's not found, show an error
    if (!data.found) {
      return;
    }
    // Otherwise get the location
    var p = data.features[0];
    // Zoom to where it is
    formMap.map.fitBounds(p.bounds);

    // And drop a pin
    var newLatLng = new L.LatLng(p.centroid.coordinates[0], p.centroid.coordinates[1]);
    formMap
      .clearMarkers()
      .addMarker(newLatLng)
      .renderMarkers()
      .update(newLatLng)
      .save();
  }

  locationControl.on('click', '#locate', function(e){

    var parent        = $(e.delegateTarget),
        textarea      = parent.find('textarea'),
        locationQuery = textarea.val();

    if ($.trim(locationQuery)!==""){
      locationQuery = locationQuery.replace(/\n/g,' ');
      geoQuery(locationQuery);
    }

  });


})();


/*
*   form
*   attendee limit toggle
*/
(function(){
  'use strict';


  var AttendeesForm = (function(){

    var attendeesForm = function(options){

      this.el = null;
      if(typeof options.el !== 'undefined'){
        this.$el = $(options.el);
      }

      this.controls = {
        choices : null
      };
      if(typeof options.choices !== 'undefined'){
        this.controls.choices = $(options.choices);
      }

      this.form = {
        attendees : null
      };
      if(typeof options.attendees){
        this.form.attendees = $(options.attendees);
      }

      this.has_attendees_limit = false;
      if(this.form.attendees.val() !== "" || this.form.attendees.val() !== 0 ){
        this.has_attendees_limit = true;
      }

      console.log(options);
      console.log(this);

      this.bind();

    };


    attendeesForm.prototype.enabledAttendeeLimitField = function(){
      this.form.attendees.attr('disabled',false).focus();
    };
    attendeesForm.prototype.disableAttendeeLimitField = function(){
      this.form.attendees.val(0).attr('disabled',true);
    };

    attendeesForm.prototype.onChangeChoiceHandler = function(e){

      var radio = $(e.currentTarget);

      if (radio.val() == "1"){
        this.has_attendees_limit = 1;
        this.enabledAttendeeLimitField();
      }else{
        this.has_attendees_limit = 0;
        this.disableAttendeeLimitField();
      }

    };

    attendeesForm.prototype.bind = function(){

      var events = [
        ['change', 'input[name='+this.controls.choices[0].name+']', 'onChangeChoiceHandler' ]
      ];

      if (events.length>0){
        for(var i=0,j=events.length;i<j;i++){
          this.$el.on(events[i][0], events[i][1], $.proxy(this[events[i][2]], this) );
        }
      }

    };

    return attendeesForm;

  })();

  window.AttendeesForm = AttendeesForm;

})();
