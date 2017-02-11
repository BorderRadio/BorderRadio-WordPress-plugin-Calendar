/*******************************************************************************
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 ******************************************************************************/

/*
  This is the WordPress editorial calendar.  It is a continuous
  calendar in both directions.  That means instead of showing only
  one month at a time it shows the months running together.  Users
  can scroll from one month to the next using the up and down
  arrow keys, the page up and page down keys, the next and previous
  month buttons, and their mouse wheel.

  The calendar shows five weeks visible at a time and maintains 11
  weeks of rendered HTML.  Only the middle weeks are visible.

                    Week 1
                    Week 2
                    Week 3
                -   Week 4   -
                |   Week 5   |
                |   Week 6   |
                |   Week 7   |
                -   Week 8   -
                    Week 9
                    Week 10
                    Week 11

  When the user scrolls down one week the new week is added at the
  end of the calendar and the first week is removed.  In this way
  the calendar will only ever have 11 weeks total and won't use up
  excessive memory.

  This calendar uses AJAX to call into the functions defined in
  borcal.php.  These functions get posts and change post dates.

  The HTML structure of the calendar is:

  <div id="cal">
      <div id="row08Nov2009">
          <div id="row08Nov2009row">
              <div class="day sunday nov" id="08Nov2009">
                  <div class="dayobj">
                      <div class="daylabel">8</div>
                      <ul class="postlist">
                      </ul>
                   </div>
               </div>
          </div>
      </div>
  </div>
 */
var borcal = {

    /*
       This value is the number of weeks the user wants to see at one time
       in the calendar.
     */
    weeksPref: 2,

    /*
       This is a preference value indicating if you see the post status
     */
    statusPref: true,

    /*
       This is a preference value indicating if you see the post author
     */
    authorPref: false,

    /*
       This is a preference value indicating if you see the post time
     */
    timePref: true,

    /*
       This is a preference value indicating if we should prompt for feeback
     */
    doFeedbackPref: false,

    /*
     * True if the calendar is in the process of moving
     */
    isMoving: false,

    /*
     * True if we are in the middle of dragging a post
     */
    inDrag: false,

    /*
       True if the calendar is in the process of queueing scrolling
       during a drag.
     */
    isDragScrolling: false,

    /*
     * This is the format we use to dates that we use as IDs in the
     * calendar.  It is independant of the visible date which is
     * formatted based on the user's locale.
     */
    internalDateFormat: 'ddMMyyyy',

    /*
       This is the position of the calendar on the screen in pixels.
       It is an array with two fields:  top and bottom.
     */
    position: null,

    /*
     * This is the first date of the current month
     */
    firstDayOfMonth: null,

    /*
     * This is the first day of the next month
     */
    firstDayOfNextMonth: null,

    /*
     * The date format used by wordpress
     */
    wp_dateFormat: 'yyyy-MM-dd',

    /*
     * The cache of dates we have already loaded posts for.
     */
    cacheDates: [],

    /*
     * The ID of the timer we use to batch new post requests
     */
    tID: null,

    /*
     * The number of steps moving for this timer.
     */
    steps: 0,

    /*
     * The constant for the concurrency error.
     */
    CONCURRENCY_ERROR: 4,

    /*
     * The constant for the user permission error
     */
    PERMISSION_ERROR: 5,

    /*
     * The constant for the nonce error
     */
    NONCE_ERROR: 6,

    /*
       The direction the calendar last moved.
       true = down = to the future
       false = up = to the past

     */
    currentDirection: true,

    /*
       This date is our index.  When the calendar moves we
       update this date to indicate the next rows we need
       to add.
     */
    _wDate: Date.today(),

    /*
     * The date since the previous move
     */
    moveDate: null,

    /*
     * This is a number from 0-6 indicating when the start
     * of the week is.  The user sets this in the Settings >
     * General page and it is a single value for the entire
     * server.  We are setting this value in borcal.php
     */
    startOfWeek: null,

    /*
       A cache of all the posts we have loaded so far.  The
       data structure is:

       posts [date - ddMMMyyyy][posts array - post object from JSON data]
     */
    posts: [],

    /*
       IE will sometimes fire the resize event twice for the same resize
       action.  We save it so we only resize the calendar once and avoid
       any flickering.
     */
    windowHeight: 0,

    /*
       This function aligns the grid in two directions.  There
       is a vertical grid with a row of each week and a horizontal
       grid for each week with a list of days.
     */
    alignGrid: function(/*string*/ gridid, /*int*/ cols, /*int*/ cellWidth, /*int*/ cellHeight, /*int*/ padding) {
        var x = 0;
        var y = 0;
        var count = 1;

        jQuery(gridid).each(function() {
            jQuery(this).css('position', 'relative');

            jQuery(this).children('div').each(function() {
                jQuery(this).css({
                    width: cellWidth + '%',
                    height: cellHeight + '%',
                    position: 'absolute',
                    left: x + '%',
                    top: y + '%'
                });

                if ((count % cols) === 0) {
                    x = 0;
                    y += cellHeight + padding;
                } else {
                    x += cellWidth + padding;
                }

                count++;
            });
        });
    },

    /*
       This is a helper function to align the calendar so we don't
       have to change the cell sizes in multiple places.
     */
    alignCal: function() {
        borcal.alignGrid('#cal', 1, 100, (100 / borcal.weeksPref) - 1, 1);
    },


    /*
       This function creates the days header at the top of the
       calendar.
     */
    createDaysHeader: function() {
        /*
         * The first day of the week in the calendar depends on
         * a wordpress setting and maybe the server locale.  This
         * means we need to determine the days of the week dynamically.
         * Luckily the Date.js library already has these strings
         * localized for us.  All we need to do is figure out the
         * first day of the week and then we can add a day from there.
         */

        var date = Date.today().next().sunday();

        /*
         * We need to call nextStartOfWeek to make sure the
         * borcal.startOfWeek variable gets initialized.
         */
        borcal.nextStartOfWeek(date);


        var html = '<div class="dayheadcont"><div class="dayhead firstday">' +
            date.add(borcal.startOfWeek).days().toString('dddd') +
        '</div>';

        html += '<div class="dayhead">' + date.add(1).days().toString('dddd') + '</div>';
        html += '<div class="dayhead">' + date.add(1).days().toString('dddd') + '</div>';
        html += '<div class="dayhead">' + date.add(1).days().toString('dddd') + '</div>';
        html += '<div class="dayhead">' + date.add(1).days().toString('dddd') + '</div>';
        html += '<div class="dayhead">' + date.add(1).days().toString('dddd') + '</div>';
        html += '<div class="dayhead lastday">' + date.add(1).days().toString('dddd') + '</div>';

        jQuery('#cal_cont').prepend(html);

        borcal.alignGrid('.dayheadcont', 7, 13.8, 100, 0.5);
    },

    /*
       We have different styles for days in previous months,
       the current month, and future months.  This function
       figures out the right class based on the date.
     */
    getDateClass: function(/*Date*/ date) {

         var monthstyle;
         var daystyle;

         if (date.compareTo(Date.today()) == -1) {
             /*
              * Date is before today
              */
             daystyle = 'beforeToday';
         } else {
             /*
              * Date is after today
              */
             daystyle = 'todayAndAfter';
         }
         if (!borcal.firstDayOfMonth) {
             /*
              * We only need to figure out the first and last day
              * of the month once
              */
             borcal.firstDayOfMonth = Date.today().moveToFirstDayOfMonth().clearTime();
             borcal.firstDayOfNextMonth = Date.today().moveToLastDayOfMonth().clearTime();
         }
         if (date.between(borcal.firstDayOfMonth, borcal.firstDayOfNextMonth)) {
             /*
              * If the date isn't before the first of the
              * month and it isn't after the last of the
              * month then it is in the current month.
              */
             monthstyle = 'month-present';
         } else if (date.compareTo(borcal.firstDayOfMonth) == 1) {
             /*
              * Then the date is after the current month
              */
             monthstyle = 'month-future';
         } else if (date.compareTo(borcal.firstDayOfNextMonth) == -1) {
             /*
              * Then the date is before the current month
              */
             monthstyle = 'month-past';
         }

         if (date.toString('dd') == '01') {
             /*
              * This this date is the first day of the month
              */
             daystyle += ' firstOfMonth';
         }


         return monthstyle + ' ' + daystyle;
    },

    /*
       Show the add post link.  This gets called when the mouse
       is over a specific day.
     */
    showAddPostLink: function(/*string*/ dayid) {
         if (borcal.inDrag) {
             return;
         }

         var createLink = jQuery('#' + dayid + ' a.daynewlink');
         createLink.css('display', 'block');
         createLink.bind('click', borcal.addPost);
    },

    /*
       Hides the add new post link it is called when the mouse moves
       outside of the calendar day.
     */
    hideAddPostLink: function(/*string*/ dayid) {
         var link = jQuery('#' + dayid + ' a.daynewlink').hide();
         link.unbind('click', borcal.addPost);
    },

    /*
       Creates a row of the calendar and adds all of the CSS classes
       and listeners for each calendar day.
     */
    createRow: function(/*jQuery*/ parent, /*bool*/ append) {
        var _date = borcal._wDate.clone();

        var newrow = '<div class="rowcont" id="' + 'row' + borcal._wDate.toString(borcal.internalDateFormat) + '">' +
                     '<div id="' + 'row' + borcal._wDate.toString(borcal.internalDateFormat) + 'row" class="row">';
        for (var i = 0; i < 7; i++) {
            /*
             * Adding all of these calls in the string is kind of messy.  We
             * could do this with the JQuery live function, but there are a lot
             * of days in the calendar and the live function gets a little slow.
             */
            newrow += '<div onmouseover="borcal.showAddPostLink(\'' + _date.toString(borcal.internalDateFormat) + '\');" ' +
                      'onmouseout="borcal.hideAddPostLink(\'' + _date.toString(borcal.internalDateFormat) + '\');" ' +
                      'id="' + _date.toString(borcal.internalDateFormat) + '" class="day ' +
                      borcal.getDateClass(_date) + ' ' +
                      _date.toString('dddd').toLowerCase() + ' month-' +
                      _date.toString('MM').toLowerCase() + '">';

            newrow += '<div class="dayobj">';
//DHARMAN: Following row uasefull only if day is after today
            newrow += '<a href="#" adddate="' + _date.toString('MMMM d') + '" class="daynewlink" title="' +
                sprintf(borcal.str_newschedule, _date.toString(Date.CultureInfo.formatPatterns.monthDay)) + '" ';
//                          'onclick="return false;">' + Date.today()-_date.toString('MMMM d') + '</a>';


						if (_date.compareTo(Date.today()) > 0) {
								//Date is after today
								newrow += 'onclick="return false;">' + borcal.str_addScheduleLink + '</a>';
						}
						else
						{
							newrow += 'onclick="return false;"></a>';
						}


// 							  newrow += 'onclick="return false;">' + borcal.str_addScheduleLink + '</a>';

            if (_date.toString('dd') == '01') {
                newrow += '<div class="daylabel">' + _date.toString('MMM d');
            } else {
                newrow += '<div class="daylabel">' + _date.toString('d');
            }


            newrow += '</div>';

            newrow += '<ul class="postlist">';

            newrow += borcal.getPostItems(_date.toString(borcal.internalDateFormat));

            newrow += '</ul>';

            newrow += '</div>';
            newrow += '</div>';
            _date.add(1).days();
        }

        newrow += '</div></div>';

        if (append) {
            parent.append(newrow);

        } else {
            parent.prepend(newrow);
        }

        /*
         * This is the horizontal alignment of an individual week
         */
        borcal.alignGrid('#row' + borcal._wDate.toString(borcal.internalDateFormat) + 'row', 7, 13.9, 100, 0.5);

        borcal.draggablePost('#row' + borcal._wDate.toString(borcal.internalDateFormat) + ' li.post');

        jQuery('#row' + borcal._wDate.toString(borcal.internalDateFormat) + ' > div > div.day').droppable({
            hoverClass: 'day-active',
            accept: function(ui) {
                /*
                   We only let them drag draft posts into the past.  If
                   they try to drag and scheduled post into the past we
                   reject the drag.  Using the class here is a little
                   fragile, but it is much faster than doing date
                   arithmetic every time the mouse twitches.
                 */
                if (jQuery(this).hasClass('beforeToday')) {
                    if (ui.hasClass('draft')) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            },
            greedy: true,
            tolerance: 'pointer',
            drop: function(event, ui) {
                           //output('dropped ui.draggable.attr("id"): ' + ui.draggable.attr("id"));
                           //output('dropped on jQuery(this).attr("id"): ' + jQuery(this).attr("id"));
                           //output('ui.draggable.html(): ' + ui.draggable.html());

                           var dayId = ui.draggable.parent().parent().parent().attr('id');

                           borcal.doDrop(dayId, ui.draggable.attr('id'), jQuery(this).attr('id'));
                        }
            });

        return jQuery('row' + borcal._wDate.toString(borcal.internalDateFormat));
    },

    /*
     * Handle the drop when a user drags and drops a post.
     */
    doDrop: function(/*string*/ parentId, /*string*/ postId, /*string*/ newDate, /*function*/ callback) {
         var dayId = parentId;


         // Step 0. Get the post object from the map
         var post = borcal.findPostForId(parentId, postId);

         // Step 1. Remove the post from the posts map
         borcal.removePostFromMap(parentId, postId);

         /*
            Step 2. Remove the old element from the old parent.

            We would like to just remove the item right away,
            but on IE with JQuery UI 1.8 that causes an error
            because it tries to access the properties of the
            object to reset the cursor and it can't since the
            object is not longer part of the DOM.  That is why
            we detach it instead of removing it.

            However, this causes a small memory leak since every
            drag will detach an element and never remove it.  To
            clean up we wait half a second until the drag is done
            and then remove the item.  Hacky, but it works.
          */
         var oldPost = jQuery('#' + postId);
         oldPost.detach();

         setTimeout(function() {
             oldPost.remove();
         }, 500);

         // Step 3. Add the item to the new DOM parent
         jQuery('#' + newDate + ' .postlist').append(borcal.createPostItem(post, newDate));


         if (dayId == newDate) {
             /*
              If they dropped back on to the day they started with we
              don't want to go back to the server.
              */
             borcal.draggablePost('#' + newDate + ' .post');
         } else {
             // Step6. Update the date on the server
             borcal.changeDate(newDate, post, callback);
         }
    },

    /*
     * This is a helper method to make an individual post item draggable.
     */
    draggablePost: function(/*post selector*/ post) {}
    //DHARMAN: Followinf is usefull to manage schedule drag&drop
/*         jQuery(post).each(function() {
             var postObj = borcal.findPostForId(jQuery(this).parent().parent().parent().attr('id'),
                                               jQuery(this).attr('id'));
             if (borcal.isPostMovable(postObj)) {
                 jQuery(this).draggable({
                     revert: 'invalid',
                     appendTo: 'body',
                     helper: 'clone',
                     distance: 1,
                     addClasses: false,
                     start: function() {
                       borcal.inDrag = true;
                     },
                     stop: function() {
                       borcal.inDrag = false;
                     },
                     drag: function(event, ui) {
                        borcal.handleDrag(event, ui);
                     },
                     scroll: false,
                     refreshPositions: true
                 });
                 jQuery(this).addClass('draggable');
             }
         });
    }*/,

    /*
       When the user is dragging we scroll the calendar when they get
       close to the top or bottom of the calendar.  This function handles
       scrolling the calendar when that happens.
     */
    handleDrag: function(event, ui) {
         if (borcal.isMoving || borcal.isDragScrolling) {
             return;
         }

         borcal.isDragScrolling = true;

         if (event.pageY < (borcal.position.top + 10)) {
             /*
                This means we're close enough to the top of the calendar to
                start scrolling up.
              */
             borcal.move(1, false);
         } else if (event.pageY > (borcal.position.bottom - 10)) {
             /*
                This means we're close enough to the bottom of the calendar
                to start scrolling down.
              */
             borcal.move(1, true);
         }

         /*
            We want to start scrolling as soon as the user gets their mouse
            close to the top, but if we just scrolle with every event then
            the screen flies by way too fast.  We wait here so we scroll one
            row and wait three quarters of a second.  That way it gives a
            smooth scroll that doesn't go too fast to track.
          */
         setTimeout(function() {
             borcal.isDragScrolling = false;
         }, 300);
    },

    /*
       This is a utility method to find a post and remove it
       from the cache map.
     */
    removePostFromMap: function(/*string*/ dayobjId, /*string*/ postId) {
         if (borcal.posts[dayobjId]) {
             for (var i = 0; i < borcal.posts[dayobjId].length; i++) {
                 if (borcal.posts[dayobjId][i] &&
                     'post-' + borcal.posts[dayobjId][i].id === postId) {
                     borcal.posts[dayobjId][i] = null;
                     return true;
                 }
             }
         }

         return false;
    },

    /*
     * Adds a post to an already existing calendar day.
     */
    addPostItem: function(/*post*/ post, /*string*/ dayobjId/*, pollo*/) {
         /*
          * We are trying to select the .postlist item under this div.  It would
          * be much more adaptable to reference the class by name, but this is
          * significantly faster.  Especially on IE.
          */
// 				 if(post.id == '201149504')
// 				 {
// 					 borcal.showError(borcal.createPostItem(post, '09122011'));/*exit;*/
// 						jQuery('#' + dayobjId + ' > div').append('<P>POLLLLLLLLLLLLLO</P>');
// 				 alert(dayobjId);}


// 				 				pollo="<li onmouseover=\"borcal.showActionLinks('post-201149504');\" onmouseout=\"borcal.hideActionLinks('post-201149504');\" id=\"post-201149504\" class=\"post broadcast \"><div class=\"postlink \"><span class=\"posttime\">21.00-22.00</span> rterter [broadcast]</div></li>";
// 				 				jQuery('#09122011 > div > ul').append(pollo);}
// 				 else
// 2011-12-09
         jQuery('#' + dayobjId + ' > div > ul').append(borcal.createPostItem(post, dayobjId));
    },

		addPostItem2: function(/*post*/ post, /*string*/ dayobjId/*, pollo*/) {
				done = false;
				jQuery('#' + dayobjId + ' > div > ul').children().each(function(){
					listElement = jQuery('#'+this.id);
					schedule = jQuery('#'+this.id+' > div > span');
					scheduleBeginTime = schedule.html().split('-')[0];
					if(scheduleBeginTime>post.beginTime && done == false)
					{
						done = true;
						listElement.before(borcal.createPostItem(post, dayobjId));
					}
				});
		},

    /*
       Makes all the posts in the specified day draggable
       and adds the tooltip.
     */
    addPostItemDragAndToolltip: function(/*string*/ dayobjId) {
         borcal.draggablePost('#' + dayobjId + ' > div > ul > li');
    },


    /*
        Deletes the post specified. Will only be executed once the user clicks the confirm link to proceed.
    */
    deletePost: function(/*Post ID*/ postId, /*function*/ callback) {

        var url = borcal.ajax_url() + '&action=borcal_deletepost&postid=' + postId;
        jQuery.ajax({
            url: url,
            type: 'POST',
            processData: false,
            timeout: 100000,
            dataType: 'json',
            success: function(res) {
							borcal.removePostItem(res.post.date, 'post-' + res.post.id);
                if (res.error) {
                    /*
                     * If there was an error we need to remove the dropped
                     * post item.
                     */
                    if (res.error === borcal.NONCE_ERROR) {
                        borcal.showError(borcal.checksum_error);
                    }
                } else {
                    borcal.output('Finished deleting the post: "' + res.post.title + '"');
                }

                if (callback) {
                    callback(res);
                }
            },
            error: function(xhr) {
                 borcal.showError(borcal.general_error);
                 if (xhr.responseText) {
                     borcal.output('deletePost xhr.responseText: ' + xhr.responseText);
                 }
            }
        });
    },




    /*
     * Confirms if you want to delete the specified post
     */
    confirmDelete: function(/*string*/ posttitle) {
         if (confirm(borcal.str_del_msg1 + "\n" + borcal.str_del_msg2)) {
             return true;
    // [wes] might be better to call deletePost from here directly, rather than return control back to the agent... which will then follow the link and call deletePost
         } else {
             return false;
         }
    },

    /*
       This is a simple function that creates the AJAX URL with the
       nonce value generated in borcal.php.
     */
    ajax_url: function() {
         return ajaxurl + '?_wpnonce=' + borcal.wp_nonce;
    },

    /*
        NOT USED
     */
    getMediaBar: function() {
         return jQuery('#cal_mediabar').html();
    },

    /*
     * Called when the "Add a post" link is clicked.
     * Sets up a post object and displays the add form
     */
    addPost: function() {
        jQuery('#newPostScheduleButton').addClass('disabled');
        var date = jQuery(this).parent().parent().attr('id');

        var formattedtime = '10:00';
        if (borcal.timeFormat !== 'H:i') {
            formattedtime += ' AM';
        }

        var post = {
            id: 0,
            date: date,
            formatteddate: borcal.getDayFromDayId(date).toString(borcal.previewDateFormat),
            time: formattedtime
        };
        borcal.showForm(post);
        return false;
    },

    /*
     * Called when the Edit link for a post is clicked.
     * Gets post details via an AJAX call and displays the edit form
     * with the fields populated.
     */
    editPost: function(/*int*/ post_id) {
// 			borcal.showError("POLLO3");exit;
        // Un-disable the save buttons because we're editing
        jQuery('#newPostScheduleButton').removeClass('disabled');

        // Editing, so we need to make an ajax call to get body of post
        borcal.getPost(post_id, borcal.showForm);
        return false;
    },


    /*
     * When the user presses the new post link on each calendar cell they get
     * a tooltip which prompts them to add or edit a post.  Once
     * they hit save we call this function.
     *
     * post - post object containing data for the post
     * doEdit - should we edit the post immediately?  if true we send the user
     *          to the edit screen for their new post.
     */
    savePost: function(/*object*/ post, /*boolean*/ doEdit, /*boolean*/ doPublish, /*function*/ callback) {
// 			borcal.showError("POLLO3");exit;
         if (typeof(post) === 'undefined' || post === null) {
            post = borcal.serializePost();
         }

//          borcal.showError("Saving...");exit;
         borcal.output('savePost(' + post.date + ', ' + post.title + ')');

         jQuery('#edit-slug-buttons').addClass('tiploading');
         /*
            The date.js library has a bug where it gives the wrong
            24 hour value for 12AM and 12PM.  I've filed a bug report,
            but we still need to work aorund the issue.  Hackito
            ergo sum.
          */
//          if (post.time.toUpperCase() === '12:00 PM') {
//              post.time = '12:00';
//          } else if (post.time.toUpperCase() === '12:30 PM') {
//              post.time = '12:30';
//          } else if (post.time.toUpperCase() === '12:00 AM') {
//              post.time = '00:00';
//          } else if (post.time.toUpperCase() === '12:30 AM') {
//              post.time = '00:30';
//          }

// 				borcal.showError(post.id+'-<br>'+post.beginTime+'-<br>'+post.endTime+'-<br>'+post.kind+'-<br>'+post.title+'-<br>'+post.content);exit;

         var time;
         if (post.time !== '') {
            time = Date.parse(post.time);
         } else {
            time = Date.parse('10:00:00'); // If we don't have a time set, default it to 10am
         }

//          var formattedtime = time.format('H:i:s');

//          var formattedDate = encodeURIComponent(borcal.getDayFromDayId(post.date).toString(borcal.wp_dateFormat) + ' ' + formattedtime);
					var formattedDate = encodeURIComponent(borcal.getDayFromDayId(post.date).toString(borcal.wp_dateFormat))

// 					var scheduleId =

					if(!borcal.checkScheduleToSave(post)) {
						jQuery('#newPostScheduleButton').addClass('disabled');
						return;
					}

         var url = borcal.ajax_url() + '&action=borcal_savepost';
         var postData = 'title=' + encodeURIComponent(post.title) +
                       '&content=' + encodeURIComponent(post.content) +
											 '&id=' + encodeURIComponent(post.id) +
											 '&date=' + encodeURIComponent(formattedDate) +
											 '&beginTime=' + encodeURIComponent(post.beginTime) +
											 '&endTime=' + encodeURIComponent(post.endTime) +
                       '&kind=' + encodeURIComponent(post.kind);

         if (borcal.getUrlVars().post_type) {
             postData += '&post_type=' + encodeURIComponent(borcal.getUrlVars().post_type);
         }

         if (doEdit) {
					 postData += '&action=' + encodeURIComponent('edit');
//              postData += '&op=edit';
				 }
         else
				 {
					 postData += '&action=' + encodeURIComponent('add');
//              postData += '&op=add';
         }

//                   borcal.showError("Saving: "+postData);exit;
         jQuery.ajax({
            url: url,
            type: 'POST',
            processData: false,
            data: postData,
            timeout: 100000,
            dataType: 'json',
            success: function(res) {
                jQuery('#edit-slug-buttons').removeClass('tiploading');
                jQuery('#tooltip').hide();
                if (res.error) {
                    /*
                     * If there was an error we need to remove the dropped
                     * post item.
                     */
                    if (res.error === borcal.NONCE_ERROR) {
                        borcal.showError(borcal.checksum_error);
                    }
                    return;
                }
                if (!res.post) {
                    borcal.showError('There was an error creating a new post for your blog.');
                } else {
												var arrDay = res.post.date.split('-');
												dayobjId = arrDay[2]+arrDay[1]+arrDay[0]
                        if (res.post.id) {
													borcal.removePostItem(dayobjId, res.post.id);
// 														borcal.showError(res.post.date+res.post.id);exit;
                        }

												borcal.addPostItem2(res.post, dayobjId,res.post.id);
                        borcal.addPostItemDragAndToolltip(res.post.date);
// 												borcal.showError("Saved: "+res.post.id);/*exit;*/
//                     }
                }

                if (callback) {
                    callback(res);
                }
            },
            error: function(xhr) {
                 jQuery('#edit-slug-buttons').removeClass('tiploading');
                 jQuery('#tooltip').hide();
                 borcal.showError(borcal.general_error);
                 if (xhr.responseText) {
                     borcal.output('savePost xhr.responseText: ' + xhr.responseText);
                 }
            }
        });
        return false;
    },

    /*
     * Collects form values for the post inputted by the user into an object
     */
    serializePost: function() {
        var post = {};

        jQuery('#tooltip').find('input, textarea, select').each(function() {
            post[this.name] = this.value;
        });
        return post;
    },

		pollo: function (){
// 			var selectmenu=document.getElementById("borcal-title-new-field")
			alert("POLLO"+document.getElementById("borcal-title-new-field").value);
			// selectmenu.onchange=function(){ //run some code when "onchange" event fires
			// document.getElementById("content").text="POLLO";
			//  var chosenoption=this.options[this.selectedIndex] //this refers to "selectmenu"
			//  if (chosenoption.value!="nothing"){
				//   window.open(chosenoption.value, "", "") //open target site (based on option's value attr) in new window
				//  }
				// }
		},


    /*
     * Accepts new or existing post data and then populates text fields as necessary
     */
    showForm: function(post) {
        borcal.resetForm();
// borcal.showError(postData);exit;
// alert("sdsd");exit;
        // show tooltip
        jQuery('#tooltip').center().show();

        if (!post.id) {
            jQuery('#tooltiptitle').text(borcal.str_newschedule_title + ' - ' + post.formatteddate);
        } else {
            jQuery('#tooltiptitle').text(sprintf(borcal.str_editschedule_title, post.typeTitle, borcal.getDayFromDayId(post.date).toString(borcal.previewDateFormat)));
        }
				// add post info to form
				jQuery('#borcal-title-new-field').val(post.title);
				jQuery('#content').val(post.content);
				jQuery('#borcal-schedule-kind').val(post.kind);

        var beginTime = post.beginTime;
				var endTime = post.endTime;
        jQuery('#borcal-beginTime').val(beginTime);
				jQuery('#borcal-endTime').val(endTime);

        // set hidden fields: post.date, post.id
        jQuery('#borcal-date').val(post.date);
        jQuery('#borcal-id').val(post.id);

        /*
         * Put the focus in the post title field when the tooltip opens.
         */
        jQuery('#borcal-title-new-field').focus();
        jQuery('#borcal-title-new-field').select();

				var classList = jQuery('#newPostScheduleButton').attr('class').split(/\s+/);
				var idx = classList.indexOf('doEdit'); // Find the index

				if(post.id == 0)
				{
					if(idx!=-1) classList.splice(idx, 1); // Remove it if really found!
					jQuery('#newPostScheduleButton').text(borcal.str_add);
				}
				else
				{
					if(idx==-1) classList.push('doEdit'); // Add it !
					jQuery('#newPostScheduleButton').text(borcal.str_save);
				}
				jQuery('#newPostScheduleButton').attr('class', classList.join(" "));

// 				alert(jQuery('#09122011 > div > ul').attr('class'));
    },

    /*
     * Hides the add/edit form
     */
    hideForm: function() {
        jQuery('#tooltip').hide();
        borcal.resetForm();
    },

    /*
     * Clears all the input values in the add/edit form
     */
    resetForm: function() {
        jQuery('#tooltip').find('input, textarea, select').each(function() {
            this.value = '';
        });

        jQuery('#borcal-schedule-kind').removeAttr('disabled');

        jQuery('#newPostScheduleButton').text('...');

        jQuery('#tooltiptitle').text('hhhh');
        //jQuery('#borcal-author-p').html('');

        jQuery('#borcal-schedule-kind').removeAttr('disabled');

        jQuery('#borcal-schedule-kind .temp').remove();
    },

    /*
       Creates the HTML for a post item and adds the data for
       the post to the posts cache.
     */
    createPostItem: function(/*post*/ post, /*string*/ dayobjId) {
        if (!borcal.posts[dayobjId]) {
            borcal.posts[dayobjId] = [];
        }

//         if(dayobjId == '09122011')
// 				{
// 					borcal.showError(borcal.getPostItemString(post));exit;
// 				}


        borcal.posts[dayobjId][borcal.posts[dayobjId].length] = post;

        return borcal.getPostItemString(post);
    },

    /*
       Finds the post object for the specified post ID  in the
       specified day.
     */
    findPostForId: function(/*string*/ dayobjId, /*string*/ postId) {
         if (borcal.posts[dayobjId]) {
            for (var i = 0; i < borcal.posts[dayobjId].length; i++) {
                if (borcal.posts[dayobjId][i] &&
                    'post-' + borcal.posts[dayobjId][i].id === postId) {
                    return borcal.posts[dayobjId][i];
                }
            }
        }
    },

    /*
     * Removes a post from the HTML and the posts cache.
     */
    removePostItem: function(/*string*/ dayobjId, /*string*/ postId) {
         if (borcal.findPostForId(dayobjId, postId)) {
             for (var i = 0; i < borcal.posts[dayobjId].length; i++) {
                 if (borcal.posts[dayobjId][i] &&
                     'post-' + borcal.posts[dayobjId][i].id === postId) {
                     borcal.posts[dayobjId][i] = null;
                     jQuery('#' + postId).remove();
                 }
             }
         }
    },

    /*
       Gets all the post items for the specified day from
       the post cache.
     */
    getPostItems: function(/*string*/ dayobjId) {
        var postsString = '';

        if (borcal.posts[dayobjId]) {
            for (var i = 0; i < borcal.posts[dayobjId].length; i++) {
                if (borcal.posts[dayobjId][i]) {
                    postsString += borcal.getPostItemString(borcal.posts[dayobjId][i]);
                }
            }
        }

        return postsString;
    },

    /*
       This function shows the action links for the post with the
       specified ID.
     */
    showActionLinks: function(/*string*/ postid) {
         var post = borcal.findPostForId(jQuery('#' + postid).parent().parent().parent().attr('id'), postid);

         if (borcal.inDrag || !borcal.isPostEditable(post)) {
             return;
         }

         var elem = jQuery('#' + postid + ' > div.postactions');

         elem.show();


         if (elem.parent().position().top + elem.parent().height() > elem.parent().parent().height()) {
             /*
                This means the action links probably won't be visible and we need to
                scroll to make sure the users can see it.
              */
             var p = jQuery('#' + postid + ' > div.postactions').parent().parent();
             p.scrollTop(p.scrollTop() + 45);
         }
    },

    /*
       Hides the action links for the post with the specified
       post ID.
     */
    hideActionLinks: function(/*string*/ postid) {
         var elem = jQuery('#' + postid + ' > div.postactions');
         elem.hide();
    },

    /*
       Returns true if the post is movable and false otherwise.
       This is based on the post date
     */
    isPostMovable: function(/*post*/ post) {
// 			borcal.showError(post.kind);exit;
         return post.editlink && post.editable == 'yes';
    },

    /*
       Returns true if the post is editable and false otherwise.
       This is based on user permissions
     */
    isPostEditable: function(/*post*/ post) {
         return post.editlink;
    },

    /*
       Returns readonly if the post isn't editable
     */
    getPostEditableClass: function(/*post*/ post) {
         if (post.editlink) {
             return '';
         } else {
             return 'readonly';
         }
    },

    /*
     * Gets the HTML string for a post.
     */
    getPostItemString: function(/*post*/ post) {
         var posttitle = post.title;

         if (posttitle === '') {
             posttitle = '[No Title]';
         }

         if (borcal.statusPref) {
             if (post.kind === 'draft' &&
                 post.sticky === '1') {
                 /*
                  * Then this post is a sticky draft
                  */
                 posttitle += borcal.str_draft_sticky;
             } else if (post.kind === 'playlis' &&
                        post.sticky === '1') {
                 /*
                  * Then this post is a sticky playlist post
                  */
                 posttitle += borcal.str_playlist_sticky;
             } else if (post.sticky === '1') {
                 posttitle += borcal.str_sticky;
             } else if (post.kind === 'playlis') {
                 posttitle += borcal.str_playlist;
             } else if (post.kind === 'draft') {
                 posttitle += borcal.str_draft;
             } else if (post.kind !== 'publish' &&
                        post.kind !== 'future' &&
                        post.kind !== 'playlis') {
                 /*
                    There are some WordPress plugins that let you specify
                    custom post status.  In that case we just want to show
                    you the status.
                  */
                 posttitle += ' [' + post.kind + ']';
             }
         }

         if (borcal.timePref) {
             posttitle = '<span class="posttime">' + post.beginTime + '-' + post.endTime + '</span> ' + posttitle;
         }

         if (borcal.authorPref) {
             posttitle = sprintf(borcal.str_by, posttitle, '<span class="postauthor">' + post.author + '</span>');
         }

         var classString = '';

				scheduleHTML = '<li onmouseover="borcal.showActionLinks(\'post-' + post.id + '\');" ' +
				'onmouseout="borcal.hideActionLinks(\'post-' + post.id + '\');" ' +
				'id="post-' + post.id + '" class="post ' + post.kind + ' ' + borcal.getPostEditableClass(post) + '"><div class="postlink ' + classString + '">' + posttitle + '</div>';

         if (borcal.isPostMovable(post))
					 scheduleHTML += '<div class="postactions">' +
                 '<a href="#" onclick="borcal.editPost(' + post.id + '); return false;">' + borcal.str_edit + '</a> | ' +
                 '<a href="' + post.dellink + '" onclick="return borcal.confirmDelete(\'' + post.title + '\');">' + borcal.str_del + '</a>' +
                 '</div>';
         return scheduleHTML+'</li>';
    },

    /*
       Finds the calendar cell for the current day and adds the
       class "today" to that cell.
     */
    setClassforToday: function() {
        /*
           We want to set a class for the cell that represents the current day so we can
           give it a background color.
         */
        jQuery('#' + Date.today().toString(borcal.internalDateFormat)).addClass('today');
    },

    /*
       Most browsers need us to set a calendar height in pixels instead
       of percent.  This function get the correct pixel height for the
       calendar based on the window height.
     */
    getCalHeight: function() {
        var myHeight = jQuery(window).height() - jQuery('#footer').height() - jQuery('#wphead').height() - 150;

        /*
           We don't want to make the calendar too short even if the
           user's screen is super short.
         */
        return Math.max(myHeight, 500);
    },

    /*
       Moves the calendar a certain number of steps in the specified direction.
       True moves the calendar down into the future and false moves the calendar
       up into the past.
     */
    move: function(/*int*/ steps, /*boolean*/ direction, /*function*/ callback) {
         /*
          * If the add/edit post form is visible, don't go anywhere.
          */
        if (jQuery('#tooltip').is(':visible')) {
            return;
        }

        /*
           The working date is a marker for the last calendar row we created.
           If we are moving forward that will be the last row, if we are moving
           backward it will be the first row.  If we switch direction we need
           to bump up our date by 11 rows times 7 days a week or 77 days.
         */
        if (borcal.currentDirection != direction) {
            if (direction) {        // into the future
                borcal._wDate = borcal._wDate.add((borcal.weeksPref + 7) * 7).days();
            } else {                // into the past
                borcal._wDate = borcal._wDate.add(-((borcal.weeksPref + 7) * 7)).days();
            }

            borcal.steps = 0;
            borcal.moveDate = borcal._wDate;
        }

        borcal.currentDirection = direction;

        var i;


        if (direction) {
            for (i = 0; i < steps; i++) {
                jQuery('#cal > div:first').remove();
                borcal.createRow(jQuery('#cal'), true);
                borcal._wDate.add(7).days();
            }
            borcal.alignCal();
        } else {
            for (i = 0; i < steps; i++) {
                jQuery('#cal > div:last').remove();
                borcal.createRow(jQuery('#cal'), false);
                borcal._wDate.add(-7).days();
            }
            borcal.alignCal();
        }

        borcal.setClassforToday();
        borcal.setDateLabel();

        /*
         * If the user clicks quickly or uses the mouse wheel they can
         * get a lot of move events very quickly and we need to batch
         * them up together.  We set a timeout and clear it if there is
         * another move before the timeout happens.
         */
        borcal.steps += steps;
        if (borcal.tID) {
            clearTimeout(borcal.tID);
        } else {
            borcal.moveDate = borcal._wDate;
        }

        borcal.tID = setTimeout(function() {

            /*
             * Now that we are done moving the calendar we need to get the posts for the
             * new dates.  We want to load the posts between the place the calendar was
             * at when the user started moving it and the place the calendar is at now.
             */
            if (!direction) {
                borcal.getPosts(borcal._wDate.clone(),
                               borcal._wDate.clone().add(7 * (borcal.steps + 1)).days(),
                               callback);
            } else {
                borcal.getPosts(borcal._wDate.clone().add(-7 * (borcal.steps + 1)).days(),
                               borcal._wDate.clone(),
                               callback);
            }

            borcal.steps = 0;
            borcal.tID = null;
            borcal.moveDate = borcal._wDate;
        }, 1000);

        if (direction) {
            /*
               If we are going into the future then wDate is way in the
               future so we need to get the current date which is four weeks
               plus the number of visible weeks before the end of the current _wDate.
             */
            jQuery.cookie('borcal_date', borcal._wDate.clone().add(-(borcal.weeksPref + 4)).weeks().toString('yyyy-dd-MM'));
        } else {
            /*
               If we are going into the past then the current date is two
               weeks after the current _wDate
             */
            jQuery.cookie('borcal_date', borcal._wDate.clone().add(3).weeks().toString('yyyy-dd-MM'));
        }
    },

    /*
       We use the date as the ID for day elements, but the Date
       library can't parse the date without spaces and using
       spaces in IDs can cause problems.  We work around the
       issue by adding the spaces back before we parse.
     */
    getDayFromDayId: function(/*dayId*/ day) {
         return Date.parseExact(day.substring(2, 4) + '/' + day.substring(0, 2) + '/' + day.substring(4), 'MM/dd/yyyy');
    },

    /*
       This is a helper method to set the date label on the top of
       the calendar.  It looks like November 2009-December2009
     */
    setDateLabel: function(year) {
        var api = jQuery('#borcal_scrollable').scrollable();
        var items = api.getVisibleItems();

        /*
           We need to get the first day in the first week and the
           last day in the last week.  We call children twice to
           work around a small JQuery issue.
         */
        var firstDate = borcal.getDayFromDayId(items.eq(0).children('.row').children('.day:first').attr('id'));
        var lastDate = borcal.getDayFromDayId(items.eq(borcal.weeksPref - 1).children('.row').children('.day:last').attr('id'));

        jQuery('#currentRange').text(firstDate.toString('MMMM yyyy') + ' - ' + lastDate.toString('MMMM yyyy'));
    },

    /*
     * We want the calendar to start on the day of the week that matches the country
     * code in the locale.  If their full locale is en-US, that means the country
     * code is US.
     *
     * This is the full list of start of the week days from unicode.org
     * http://unicode.org/repos/cldr/trunk/common/supplemental/supplementalData.xml
     */
    nextStartOfWeek: function(/*date*/ date) {
         date = date.clone();
         if (borcal.startOfWeek === null) {
             if (borcal.locale) {
                 var local = borcal.locale.toUpperCase();

                 if (borcal.endsWith(local, 'AS') ||
                     borcal.endsWith(local, 'AZ') ||
                     borcal.endsWith(local, 'BW') ||
                     borcal.endsWith(local, 'CA') ||
                     borcal.endsWith(local, 'CN') ||
                     borcal.endsWith(local, 'FO') ||
                     borcal.endsWith(local, 'GB') ||
                     borcal.endsWith(local, 'GE') ||
                     borcal.endsWith(local, 'GL') ||
                     borcal.endsWith(local, 'GU') ||
                     borcal.endsWith(local, 'HK') ||
                     borcal.endsWith(local, 'IE') ||
                     borcal.endsWith(local, 'IL') ||
                     borcal.endsWith(local, 'IN') ||
                     borcal.endsWith(local, 'IS') ||
                     borcal.endsWith(local, 'JM') ||
                     borcal.endsWith(local, 'JP') ||
                     borcal.endsWith(local, 'KG') ||
                     borcal.endsWith(local, 'KR') ||
                     borcal.endsWith(local, 'LA') ||
                     borcal.endsWith(local, 'MH') ||
                     borcal.endsWith(local, 'MN') ||
                     borcal.endsWith(local, 'MO') ||
                     borcal.endsWith(local, 'MP') ||
                     borcal.endsWith(local, 'MT') ||
                     borcal.endsWith(local, 'NZ') ||
                     borcal.endsWith(local, 'PH') ||
                     borcal.endsWith(local, 'PK') ||
                     borcal.endsWith(local, 'SG') ||
                     borcal.endsWith(local, 'SY') ||
                     borcal.endsWith(local, 'TH') ||
                     borcal.endsWith(local, 'TT') ||
                     borcal.endsWith(local, 'TW') ||
                     borcal.endsWith(local, 'UM') ||
                     borcal.endsWith(local, 'US') ||
                     borcal.endsWith(local, 'UZ') ||
                     borcal.endsWith(local, 'VI') ||
                     borcal.endsWith(local, 'ZW')) {

                     /*
                      * Sunday
                      */
                     borcal.startOfWeek = 0;
                 } else if (borcal.endsWith(local, 'MV')) {
                     /*
                      * Friday
                      */
                     borcal.startOfWeek = 5;
                 } else if (borcal.endsWith(local, 'AF') ||
                            borcal.endsWith(local, 'BH') ||
                            borcal.endsWith(local, 'DJ') ||
                            borcal.endsWith(local, 'DZ') ||
                            borcal.endsWith(local, 'EG') ||
                            borcal.endsWith(local, 'ER') ||
                            borcal.endsWith(local, 'ET') ||
                            borcal.endsWith(local, 'IQ') ||
                            borcal.endsWith(local, 'IR') ||
                            borcal.endsWith(local, 'JO') ||
                            borcal.endsWith(local, 'KE') ||
                            borcal.endsWith(local, 'KW') ||
                            borcal.endsWith(local, 'LY') ||
                            borcal.endsWith(local, 'MA') ||
                            borcal.endsWith(local, 'OM') ||
                            borcal.endsWith(local, 'QA') ||
                            borcal.endsWith(local, 'SA') ||
                            borcal.endsWith(local, 'SD') ||
                            borcal.endsWith(local, 'SO') ||
                            borcal.endsWith(local, 'TN') ||
                            borcal.endsWith(local, 'YE')) {
                     /*
                      * Sunday
                      */
                     borcal.startOfWeek = 6;
                 } else {
                     /*
                      * Monday
                      */
                     borcal.startOfWeek = 1;
                 }
             } else {
                 /*
                  * If we have no locale set we'll assume American style and
                  * make it Sunday.
                  */
                 borcal.startOfWeek = 0;
             }
         }

         return date.next().sunday().add(borcal.startOfWeek).days();
    },

    /*
     * Just a little helper function to tell if a given string (str)
     * ends with the given expression (expr).  I could adding this
     * function to the JavaScript string object, but I don't want to
     * risk conflicts with other plugins.
     */
    endsWith: function(/*string*/ str, /*string*/ expr) {
         return (str.match(expr + '$') == expr);
    },

    /*
     * Moves the calendar to the specified date.
     */
    moveTo: function(/*Date*/ date) {
         borcal.isMoving = true;
         jQuery('#cal').empty();

         jQuery.cookie('borcal_date', date.toString('yyyy-dd-MM'));

         /*
           When we first start up our working date is 4 weeks before
           the next Sunday.
          */
         borcal._wDate = borcal.nextStartOfWeek(date).add(-21).days();

         /*
           After we remove and redo all the rows we are back to
           moving in a going down direction.
          */

         borcal.currentDirection = true;

         var count = borcal.weeksPref + 6;

         for (var i = 0; i < count; i++) {
             borcal.createRow(jQuery('#cal'), true);
             borcal._wDate.add(7).days();
         }

         borcal.alignCal();

         var api = jQuery('#borcal_scrollable').scrollable();

         api.move(1);
//         This row influence the "MoveTotToday": api.move(2);

         borcal.setDateLabel();
         borcal.setClassforToday();
         borcal.isMoving = false;
    },

    /*
       When we handle dragging posts we need to know the size
       of the calendar so we figure it out ahead of time and
       save it.
     */
    savePosition: function() {
         var cal = jQuery('#borcal_scrollable');
         borcal.position = {
             top: cal.offset().top,
             bottom: cal.offset().top + cal.height()
         };

         /*
            When the user drags a post they get a "helper" element that clones
            the post and displays it during the drag.  This means they get all
            the same classes and styles.  However, the width of a post is based
            on the width of a day in the calendar and not anything in a style.
            That works well for the posts in the calendar, but it means we need
            to dynamically determine the width of the post when dragging.

            This value will remain the same until the calendar resizes.  That is
            why we do it here.  We need to get the width of the first visible day
            in the calendar which is why we use the complicated selector.  We also
            need to generate a style for it since the drag element doesn't exist
            yet and using the live function would really slow down the drag operation.

            We base this on the width of a way since they might not have any posts
            yet.
          */
         jQuery('#borcal_poststyle').remove();

         /*
            We need to figure out the height of each post list.  They all have the same
            height so we just look at the first visible list and set some styles on the
            page to set the post list height based on that.  We reset the value every
            time the page refreshes.
          */
         var dayHeight = jQuery('.rowcont:eq(2) .dayobj:first').height() - jQuery('.rowcont:eq(2) .daylabel:first').height() - 6;

         jQuery('head').append('<style id="borcal_poststyle" type="text/css">.ui-draggable-dragging {' +
                                    'width: ' + (jQuery('.rowcont:eq(2) .day:first').width() - 5) + 'px;' +
                               '}' +
                               '.postlist {' +
                                    'height: ' + dayHeight + 'px;' +
                               '}' +
                               '</style>');
    },

    /*
     * Adds the feedback section
     */
    addFeedbackSection: function() {
         if (borcal.visitCount > 3 && borcal.doFeedbackPref) {
             jQuery('#borcal_main_title').after(borcal.str_feedbackmsg);
         }
    },

    /*
     * Does the data collection.  This uses Mint to collect data about the way
     * the calendar is being used.
     */
    doFeedback: function() {
         jQuery.getScript('http://www.zackgrossbart.com/borcal/mint/?js', function() {
             borcal.saveFeedbackPref();
         });
    },

    /*
     * Sends no feedback and hides the section
     */
    noFeedback: function() {
         jQuery('#feedbacksection').hide('fast');
         borcal.saveFeedbackPref();
    },

    /*
     * Saves the feedback preference to the server
     */
    saveFeedbackPref: function() {
         var url = borcal.ajax_url() + '&action=borcal_saveoptions&dofeedback=' + encodeURIComponent('done');

         jQuery.ajax({
             url: url,
             type: 'POST',
             processData: false,
             timeout: 100000,
             dataType: 'text',
             success: function(res) {
                jQuery('#feedbacksection').html(borcal.str_feedbackdone);
                setTimeout(function() {
                    jQuery('#feedbacksection').hide('slow');
                }, 5000);
             },
             error: function(xhr) {
                borcal.showError(borcal.general_error);
                if (xhr.responseText) {
                    borcal.output('saveOptions xhr.responseText: ' + xhr.responseText);
                }
            }
        });

    },

    /*
     * Initializes the calendar
     */
    init: function() {
         if (jQuery('#borcal_scrollable').length === 0) {
             /*
              * This means we are on a page without the editorial
              * calendar
              */
             return;
         }

        borcal.addFeedbackSection();

        jQuery('#loading').hide();

        jQuery('#borcal_scrollable').css('height', borcal.getCalHeight() + 'px');
        borcal.windowHeight = jQuery(window).height();

        /*
         *  Add the days of the week
         */
        borcal.createDaysHeader();

        /*
         * We start by initializting the scrollable.  We use this to manage the
         * scrolling of the calendar, but don't actually call it to animate the
         * scrolling.  We specify an easing here because the default is "swing"
         * and that has a conflict with JavaScript used in the BuddyPress plugin/
         *
         * This doesn't really change anything since the animation happens offscreen.
         */
        jQuery('#borcal_scrollable').scrollable({
                                    vertical: true,
                                    size: borcal.weeksPref,
                                    keyboardSteps: 1,
                                    speed: 100,
                                    easing: 'linear'
                                    // use mousewheel plugin
                                    }).mousewheel();

        var api = jQuery('#borcal_scrollable').scrollable();

        /*
           When the user moves the calendar around we remember their
           date and save it in a cookie.  Then we read the cookie back
           when we reload so the calendar stays where the user left
           it last.
         */
        var curDate = jQuery.cookie('borcal_date');

        if (curDate) {
            curDate = Date.parseExact(curDate, 'yyyy-dd-MM');
            borcal.output('Resetting to date from the borcal_Date cookie: ' + curDate);
        } else {
            curDate = Date.today();
        }

        borcal.moveTo(curDate.clone());

        /*
         * The scrollable handles some basic binding.  This gets us
         * up arrow, down arrow and the mouse wheel.
         */
        api.onBeforeSeek(function(evt, direction) {
                         // inside callbacks the "this" variable is a reference to the API
            /*
             * Some times for reasons I haven't been able to figure out
             * the direction is an int instead of a boolean.  I don't
             * know why, but this works around it.
             */
            if (direction === 1) {
                direction = false;
            } else if (direction === 3) {
                direction = true;
            }

            if (!borcal.isMoving) {
                borcal.move(1, direction);
            }

            return false;
        });

        /*
         * We also want to listen for a few other key events
         */
        jQuery(document).bind('keydown', function(evt) {
            //if (evt.altKey || evt.ctrlKey) { return; }
            //output("evt.altKey: " + evt.altKey);
            //output("evt.keyCode: " + evt.keyCode);
            //output("evt.ctrlKey: " + evt.ctrlKey);

            if ((evt.keyCode === 34 && !(evt.altKey || evt.ctrlKey)) || //page down
                evt.keyCode === 40 && evt.ctrlKey) {                     // Ctrl+down down arrow
                borcal.move(borcal.weeksPref, true);
                return false;
            } else if ((evt.keyCode === 33 && !(evt.altKey || evt.ctrlKey)) || //page up
                evt.keyCode === 38 && evt.ctrlKey) {                            // Ctrl+up up arrow
                borcal.move(borcal.weeksPref, false);
                return false;
            } else if (evt.keyCode === 27) { //escape key
                borcal.hideForm();
                return false;
            }
        });

        borcal.getPosts(borcal.nextStartOfWeek(curDate).add(-3).weeks(),
                       borcal.nextStartOfWeek(curDate).add(borcal.weeksPref + 3).weeks());

        /*
           Now we bind the listeners for all of our links and the window
           resize.
         */
        jQuery('#moveToToday').click(function() {
            borcal.moveTo(Date.today());
            borcal.getPosts(borcal.nextStartOfWeek(Date.today()).add(-3).weeks(),
                           borcal.nextStartOfWeek(Date.today()).add(borcal.weeksPref + 3).weeks());
            return false;
        });

        jQuery('#prevmonth').click(function() {
            borcal.move(borcal.weeksPref, false);
            return false;
        });

        jQuery('#nextmonth').click(function() {
            borcal.move(borcal.weeksPref, true);
            return false;
        });


				function isEditSession() {
					var retValue = false
					var classList = jQuery('#newPostScheduleButton').attr('class').split(/\s+/);
					var idx = classList.indexOf('doEdit'); // Find the index
					if(idx!=-1) retValue = true;

					return retValue;
				}

        function resizeWindow(e) {
            if (borcal.windowHeight != jQuery(window).height()) {
                jQuery('#borcal_scrollable').css('height', borcal.getCalHeight() + 'px');
                borcal.windowHeight = jQuery(window).height();
                borcal.savePosition();
            }
        }
        jQuery(window).bind('resize', resizeWindow);

        jQuery('#newPostScheduleButton').live('click', function(evt) {
            // if the button is disabled, don't do anything
            if (jQuery(this).hasClass('disabled')) {
                return false;
            }
            // Otherwise,
            // make sure we can't make duplicate posts by clicking twice quickly
            jQuery(this).addClass('disabled');
            // and save the post
// 						borcal.showError(jQuery('#newPostScheduleButton').val());


// 						var operation = jQuery('#newPostScheduleButton').attr('class');
// 						alert("SESSION:"+isEditSession());
// 						borcal.showError("Saved: ");exit;
// 						var containsFoo = str.indexOf('doEdit') >= 0; // true

            return borcal.savePost(null, isEditSession());
        });

				jQuery('#borcal-title-new-field').bind('keyup', function(evt) {
					borcal.updateSaveButton();

					if (evt.keyCode == 13) {    // enter key
                /*
								 * If the user presses enter we want to save the draft.
								 */
// 								if(borcal.checkScheduleData(true))
// 								{
// 									borcal.hideForm();
									return borcal.savePost(null, isEditSession());
// 								}
					}
				});

				jQuery('#content').bind('keyup', function(evt) {
					borcal.updateSaveButton();
				});

				jQuery('#borcal-beginTime').bind('change', function(evt) {
					borcal.updateSaveButton();
				});

				jQuery('#borcal-endTime').bind('change', function(evt) {
					borcal.updateSaveButton();
				});

				jQuery('#borcal-schedule-kind').bind('change', function(evt) {
					borcal.updateSaveButton();
				});

        jQuery('#borcal_weeks_pref').live('keyup', function(evt) {
            if (jQuery('#borcal_weeks_pref').val().length > 0) {
                jQuery('#borcal_applyoptions').removeClass('disabled');
            } else {
                jQuery('#borcal_applyoptions').addClass('disabled');
            }

            if (evt.keyCode == 13) {    // enter key
                borcal.saveOptions();
            }

        });

        borcal.savePosition();

        //borcal.addOptionsSection();

        jQuery('#borcal-beginTime').timePicker({
            show24Hours: borcal.timeFormat === 'H:i',
            separator: '.',
            step: 30
        });
        jQuery('#borcal-endTime').timePicker({
            show24Hours: borcal.timeFormat === 'H:i',
            separator: '.',
            step: 30
        });
    },

		/*
		 * If inserted data are OK, then the "save button" is enabled
		 */
		updateSaveButton: function() {
			if (borcal.checkScheduleData()) {
				jQuery('#newPostScheduleButton').removeClass('disabled');
			}
			else {
				jQuery('#newPostScheduleButton').addClass('disabled');
			}
		},

		/*
		 * Check if inserted data are OK
		 */
		checkScheduleData: function(feedback) {/*
			if (typeof feedback == "undefined") {
				feedback = false;
			}*/
			var retValue = false;
// 			borcal.showError(jQuery('#borcal-schedule-kind').val());
			if (jQuery('#borcal-title-new-field').val().length > 0 &&
				jQuery('#borcal-beginTime').val().length > 0 &&
				jQuery('#borcal-endTime').val().length > 0 &&
				jQuery('#content').val().length > 0 &&
				jQuery('#borcal-schedule-kind').val() != '--')
			{
				retValue = true;
			}

			return retValue;
		},

		checkScheduleToSave: function(post) {
			var retValue = false;
// 			borcal.showError(post.id+'-<br>'+post.beginTime+'-<br>'+post.endTime+'-<br>'+post.kind+'-<br>'+post.title+'-<br>'+post.content);exit;

			if (!post.title || post.title === '') {
				borcal.showError('Missing schedule title');
			}
			else if(!post.content || post.content === ''){
				borcal.showError('Missing schedule content');
			}
			else if (!post.beginTime || post.beginTime === '') {
				borcal.showError('Missing schedule begin time');
			}
			else if (!post.endTime || post.endTime === '') {
				borcal.showError('Missing schedule end time');
			}
			else if ((post.endTime <= post.beginTime) && post.endTime != '00.00') {
				borcal.showError('Begin time must be lesser than end time:');
			}
			else if (!post.kind || post.kind === '--') {
				borcal.showError('Missing schedule kind');
			}
			else {
				retValue = true;
			}

			return retValue;
		},

    /*
       This function updates the text of te publish button in the quick
       edit dialog to match the current operation.
     */
//     updatePublishButton: function() {
//          if (jQuery('#borcal-schedule-kind').val() === 'future') {
//              jQuery('#newPostScheduleButton').text('pollo');
//          } if (jQuery('#borcal-schedule-kind').val() === 'playlis') {
//              jQuery('#newPostScheduleButton').text('pollo');
//          } else {
//              jQuery('#newPostScheduleButton').text('pollo4');
//          }
//     },

    /*
       This function makes an AJAX call and changes the date of
       the specified post on the server.
     */
    changeDate: function(/*string*/ newdate, /*Post*/ post, /*function*/ callback) {
         borcal.output('Changing the date of "' + post.title + '" to ' + newdate);
         var newdateFormatted = borcal.getDayFromDayId(newdate).toString(borcal.wp_dateFormat);

         var url = borcal.ajax_url() + '&action=borcal_changedate&postid=' + post.id +
             '&postKind=' + post.kind +
             '&newdate=' + newdateFormatted + '&olddate=' + borcal.getDayFromDayId(post.date).toString(borcal.wp_dateFormat);

         jQuery('#post-' + post.id).addClass('loadingclass');

         jQuery.ajax({
            url: url,
            type: 'POST',
            processData: false,
            timeout: 100000,
            dataType: 'json',
            success: function(res) {
                if (res.error) {
                    /*
                     * If there was an error we need to remove the dropped
                     * post item.
                     */
                    borcal.removePostItem(newdate, 'post-' + res.post.id);
                    if (res.error === borcal.CONCURRENCY_ERROR) {
                        borcal.displayMessage(borcal.concurrency_error + '<br />' + res.post.title);
                    } else if (res.error === borcal.PERMISSION_ERROR) {
                        borcal.displayMessage(borcal.permission_error);
                    } else if (res.error === borcal.NONCE_ERROR) {
                        borcal.displayMessage(borcal.checksum_error);
                    }
                }

                borcal.removePostItem(res.post.date, 'post-' + res.post.id);
                borcal.addPostItem(res.post, res.post.date);
                borcal.addPostItemDragAndToolltip(res.post.date);

                if (callback) {
                    callback(res);
                }
            },
            error: function(xhr, textStatus, error) {
                 borcal.showError(borcal.general_error);

                 borcal.output('textStatus: ' + textStatus);
                 borcal.output('error: ' + error);
                 if (xhr.responseText) {
                     borcal.output('changeDate xhr.responseText: ' + xhr.responseText);
                 }
            }
        });

    },

    /*
       Makes an AJAX call to get the posts from the server within the
       specified dates.
     */
    getPosts: function(/*Date*/ from, /*Date*/ to, /*function*/ callback) {
         borcal.output('Getting posts from ' + from + ' to ' + to);

         var shouldGet = borcal.cacheDates[from];

         if (shouldGet) {
             /*
              * TODO: We don't want to make extra AJAX calls for dates
              * that we have already covered.  This is cutting down on
              * it somewhat, but we could get much better about this.
              */
             borcal.output('Using cached results for posts from ' + from.toString('dd-MMM-yyyy') + ' to ' + to.toString('dd-MMM-yyyy'));

             if (callback) {
                 callback();
             }
             return;
         }

         borcal.cacheDates[from] = true;

         var url = borcal.ajax_url() + '&action=borcal_posts&from=' + from.toString('yyyy-MM-dd') + '&to=' + to.toString('yyyy-MM-dd');

         if (borcal.getUrlVars().post_type) {
             url += '&post_type=' + encodeURIComponent(borcal.getUrlVars().post_type);
         }

         jQuery('#loading').show();

         jQuery.ajax({
             url: url,
             type: 'GET',
             processData: false,
             timeout: 100000,
             dataType: 'text',
             success: function(res) {
                jQuery('#loading').hide();
                /*
                 * These result here can get pretty large on a busy blog and
                 * the JSON parser from JSON.org works faster than the native
                 * one used by JQuery.
                 */
                var parsedRes = JSON.parseIt(res);

                if (parsedRes.error) {
                    /*
                     * If there was an error we need to remove the dropped
                     * post item.
                     */
                    if (parsedRes.error === borcal.NONCE_ERROR) {
                        borcal.showError(borcal.checksum_error);
                    }
                    return;
                }
                var postDates = [];

                /*
                   We get the posts back with the most recent post first.  That
                   is what most blogs want.  However, we want them in the other
                   order so we can show the earliest post in a given day first.
                 */

                for (var i = parsedRes.length; i >= 0; i--) {
                    var post = parsedRes[i];
                    if (post) {
                        if (post.kind === 'trash') {
                            continue;
                        }

                        /*
                         * In some non-English locales the date comes back as all lower case.
                         * This is a problem since we use the date as the ID so we replace
                         * the first letter of the month name with the same letter in upper
                         * case to make sure we don't get into trouble.
                         */
                        post.date = post.date.replace(post.date.substring(2, 3), post.date.substring(2, 3).toUpperCase());

                        borcal.removePostItem(post.date, 'post-' + post.id);
// alert(post.id/*borcal.getPostItemString(post)*/);
                        borcal.addPostItem(post, post.date);
                        postDates[postDates.length] = post.date;
                    }
                }

                /*
                 * If the blog has a very larger number of posts then adding
                 * them all can make the UI a little slow.  Particularly IE
                 * pops up a warning giving the user a chance to abort the
                 * script.  Adding tooltips and making the items draggable is
                 * a lot of what makes things slow.  Delaying those two operations
                 * makes the UI show up much faster and the user has to wait
                 * three seconds before they can drag.  It also makes IE
                 * stop complaining.
                 */
                setTimeout(function() {
                    borcal.output('Finished adding draggable support to ' + postDates.length + ' posts.');
                    jQuery.each(postDates, function(i, postDate) {
                        borcal.addPostItemDragAndToolltip(postDate);
                    });
                }, 300);

                if (callback) {
                    callback(res);
                }

             },
             error: function(xhr) {
                borcal.showError(borcal.general_error);
                if (xhr.responseText) {
                    borcal.output('getPosts xhr.responseText: ' + xhr.responseText);
                }
            }
        });
    },

    /*
     * Retreives a single post item based on the id
     * Can optionally pass a callback function that is triggered
     * when the call successfully completes. The post object is passed
     * as a parameter for the callback.
     */
    getPost: function(/*int*/ postid, /*function*/ callback) {
        if (postid === 0) {
            return false;
        }

        // show loading
        jQuery('#loading').show();
        var url = borcal.ajax_url() + '&action=borcal_getpost&postid=' + postid;

        if (borcal.getUrlVars().post_type) {
            url += '&post_type=' + encodeURIComponent(borcal.getUrlVars().post_type);
        }
// borcal.showError(url);exit;
// alert("Pollo:"+url);exit;
// borcal_getpost&postid=201115408
        jQuery.ajax({
            url: url,
            type: 'GET',
            processData: false,
            timeout: 100000,
            dataType: 'json',
            success: function(res) {
                // hide loading
                jQuery('#loading').hide();
// 								borcal.showError("SUCCESSO");
                borcal.output('xhr for getPost returned: ' + res);
                if (res.error) {
                    if (res.error === borcal.NONCE_ERROR) {
                        borcal.showError(borcal.checksum_error);
                    }
                    return false;
                }
//                 borcal.showError("POLLO3");exit;
                if (typeof callback === 'function') {
                    callback(res.post);
                }
//                 borcal.showError("SUCCESSO");exit;
                return res.post;
            },
            error: function(xhr) {
                // hide loading
//                 borcal.showError("ERRORE");exit;
                jQuery('#loading').hide();

                 borcal.showError(borcal.general_error);
                 if (xhr.responseText) {
                     borcal.output('getPost xhr.responseText: ' + xhr.responseText);
                 }
                 return false;
            }
        });
    },

    /*
       This function adds the scren options tab to the top of the screen.  I wish
       WordPress had a hook so I could provide this in PHP, but as of version 2.9.1
       they just have an internal loop for their own screen options tabs so we're
       doing this in JavaScript.
     */
    addOptionsSection: function() {
         var html =
             '<div class="hide-if-no-js screen-meta-toggle" id="screen-options-link-wrap">' +
                '<a class="show-settings" ' +
                   'id="show-borcal-settings-link" ' +
                   'onclick="borcal.toggleOptions(); return false;" ' +
                   'href="#" ' +
                   'style="background-image: url(images/screen-options-right.gif);">' + borcal.str_screenoptions + '</a>' +
             '</div>';

         jQuery('#screen-meta-links').append(html);
    },

    /*
       Save the number of weeks options with an AJAX call.  This happens
       when you press the apply button.
     */
    saveOptions: function() {
         /*
            We start by validating the number of weeks.  We only allow
            1, 2, 3, 4, or 5 weeks at a time.
          */
         if (jQuery('#borcal_weeks_pref').val() !== '1' &&
             jQuery('#borcal_weeks_pref').val() !== '2' &&
             jQuery('#borcal_weeks_pref').val() !== '3' &&
             jQuery('#borcal_weeks_pref').val() !== '4' &&
             jQuery('#borcal_weeks_pref').val() !== '5') {
             humanMsg.displayMsg(borcal.str_weekserror);
             return;
         }

         var url = borcal.ajax_url() + '&action=borcal_saveoptions&weeks=' +
             encodeURIComponent(jQuery('#borcal_weeks_pref').val());

         jQuery('#calendar-fields-prefs').find('input, textarea, select').each(function() {
             url += '&' + encodeURIComponent(this.name) + '=' + encodeURIComponent(this.checked);
         });

         jQuery.ajax({
             url: url,
             type: 'POST',
             processData: false,
             timeout: 100000,
             dataType: 'text',
             success: function(res) {
                /*
                   Now we refresh the page because I'm too lazy to
                   make changing the weeks work inline.
                 */
                window.location.href = window.location.href;
             },
             error: function(xhr) {
                borcal.showError(borcal.general_error);
                if (xhr.responseText) {
                    borcal.output('saveOptions xhr.responseText: ' + xhr.responseText);
                }
            }
        });
    },

    /**
     * Outputs info messages to the Firebug console if it is available.
     *
     * msg    the message to write.
     */
    output: function(msg) {
        if (window.console) {
            console.info(msg);
        }
    },

    /*
     * Shows an error message and sends the message as an error to the
     * Firebug console if it is available.
     */
    showError: function(/*string*/ msg) {
        if (window.console) {
            console.error(msg);
        }

        borcal.displayMessage(msg);

    },

    /*
     * Display an error message to the user
     */
    displayMessage: function(/*string*/ msg) {
         humanMsg.displayMsg(msg);
    },

    /*
     * A helper function to get the parameters from the
     * current URL.
     */
    getUrlVars: function() {
         var vars = [], hash;
         var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
         for (var i = 0; i < hashes.length; i++) {
             hash = hashes[i].split('=');
             vars.push(hash[0]);
             vars[hash[0]] = hash[1];
         }

         return vars;
    },

    /*
     * Show an error indicating the calendar couldn't be loaded
     */
    showFatalError: function(message) {
        jQuery('#borcal_main_title').after(
            '<div class="updated below-h2" id="message"><p>' +
            borcal.str_fatal_error + message + '<br></p></div>');

        if (window.console) {
            console.error(msg);
        }
    }
};

/*
 * Helper function for jQuery to center a div
 */
jQuery.fn.center = function() {
    this.css('position', 'absolute');
    this.css('top', (jQuery(window).height() - this.outerHeight()) / 2 + jQuery(window).scrollTop() + 'px');
    this.css('left', (jQuery(window).width() - this.outerWidth()) / 2 + jQuery(window).scrollLeft() + 'px');
    return this;
};


jQuery(document).ready(function() {
    try {
        borcal.init();
    } catch (e) {
        /*
         * These kinds of errors often happen when there is a
         * conflict with a JavaScript library imported by
         * another plugin.
         */
        borcal.showFatalError(e.description);
    }

    /*
     * The calendar supports unit tests through the QUnit framework,
     * but we don't want to load the extra files when we aren't running
     * tests so we load them dynamically.  Add the qunit=true parameter
     * to run the tests.
     */
    if (borcal.getUrlVars().qunit) {
        borcal_test.runTests();
    }
});
