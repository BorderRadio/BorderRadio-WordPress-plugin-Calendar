<?php
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
Plugin Name: Border Calendar
Description: The Border Calendar makes it possible to create and manage the palimpsest for BorderRadio.
Version: 1.0
Author: dharman
Author URI: http://www.ulteriora.net
Plugin URI: http://ulteriora.net
*/

// THIS PLUGIN IS DERIVATED FROM "EDITORIAL CALENDAR"-->(http://wordpress.org/extend/plugins/editorial-calendar)
define('UTC_OFFSET', get_option('gmt_offset'));
require_once($_SERVER['DOCUMENT_ROOT'].'/wp-content/plugins/border-calendar/lib/palimpsestXML.class.php');

add_action('wp_ajax_borcal_saveoptions', 'borcal_saveoptions' );
add_action('wp_ajax_borcal_changedate', 'borcal_changedate' );
//add_action('wp_ajax_borcal_newdraft', 'borcal_newdraft' );
add_action('wp_ajax_borcal_savepost', 'borcal_savepost' );
add_action('wp_ajax_borcal_changetitle', 'borcal_changetitle' );
add_action('admin_menu', 'borcal_list_add_management_page');
add_action('wp_ajax_borcal_posts', 'borcal_posts' );
add_action('wp_ajax_borcal_getpost', 'borcal_getpost' );
add_action('wp_ajax_borcal_deletepost', 'borcal_deletepost' );
//add_action("admin_print_scripts", 'borcal_scripts');
add_action("init", 'borcal_load_language');

/*
 * This error code matches CONCURRENCY_ERROR from borcal.js
 */
$BORCAL_CONCURRENCY_ERROR = "4";

/*
 * This error code matches PERMISSION_ERROR from borcal.js
 */
$BORCAL_PERMISSION_ERROR = "5";

/*
 * This error code matches NONCE_ERROR from borcal.js
 */
$BORCAL_NONCE_ERROR = "6";

/*
 * This boolean variable will be used to check whether this
 * installation of WordPress supports custom post types.
 */
// $borcal_supports_custom_types = function_exists('get_post_types') && function_exists('get_post_type_object');

function borcal_load_language() {
    $plugin_dir = basename(dirname(__FILE__));
    load_plugin_textdomain( 'border-calendar', 'wp-content/plugins/' . $plugin_dir . '/languages/', $plugin_dir . '/languages/' );
}

/*
 * This function adds our calendar page to the admin UI
 */
function borcal_list_add_management_page(  ) {
	global $borcal_supports_custom_types,$current_user;//, $wp_roles;

	if ( function_exists('add_management_page') ) {
		if( $current_user->id )  {
			$arrEnabledRoles = Array('administrator','palinsesto');
	// 		foreach($arrEnabledRoles as $role => $Role) {
			foreach($arrEnabledRoles as $role) {
				if (array_key_exists($role, $current_user->caps))
				{
// 					exec('echo "POLLO: Attivazione plugin borcal per '.$current_user->user_login.'">>/tmp/pollo');
					$page = add_menu_page('Calendar', __('Palimpsest', 'border-calendar'), $role, 'palimpsest', 'borcal_list_admin', path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) ).'/images/borcal.png'), 50);
					add_action( "admin_print_scripts-$page", 'borcal_scripts' );
					break;
				}
			}
		}



// // 	exec('echo "POLLOX: Carico plugin borcal'.'">>/tmp/pollo');
// 	if ( function_exists('add_management_page') ) {
// 		if( $current_user->id )  {
// // 			foreach($wp_roles->role_names as $role => $Role) {
// 				if (array_key_exists('palinsesto', $current_user->caps))
// 				{
// // 					exec('echo "POLLOY: Attivazione plugin borcal per '.$current_user->user_login.'">>/tmp/pollo');
// 					$page = add_menu_page('Calendar', __('Palimpsest', 'border-calendar'), 'palinsesto', 'palimpsest', 'borcal_list_admin', path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) ).'/images/borcal.png'), 50);
// 					add_action( "admin_print_scripts-$page", 'borcal_scripts' );
// // 					break;
// 				}
// 				elseif (array_key_exists('administrator', $current_user->caps))
// 				{
// // 					exec('echo "POLLOY: Attivazione plugin borcal per '.$current_user->user_login.'">>/tmp/pollo');
// 					$page = add_menu_page('Calendar', __('Palimpsest', 'border-calendar'), 'administrator', 'palimpsest', 'borcal_list_admin', path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) ).'/images/borcal.png'), 50);
// 					add_action( "admin_print_scripts-$page", 'borcal_scripts' );
// // 					break;
// 				}
// 		}
	// http://codex.wordpress.org/Function_Reference/add_menu_page
        //$page = add_posts_page( __('Calendar', 'border-calendar'), __('Calendar', 'border-calendar'), 'edit_posts', 'cal', 'borcal_list_admin' );


// 		if($borcal_supports_custom_types) {
//
// 	        /*
// 	         * We add one calendar for Posts and then we add a separate calendar for each
// 	         * custom post type.  This calendar will have an URL like this:
// 	         * /wp-admin/edit.php?post_type=podcasts&page=cal_podcasts
// 	         *
// 	         * We can then use the post_type parameter to show the posts of just that custom
// 	         * type and update the labels for each post type.
// 	         */
// 	        $args = array(
// 	            'public'   => true,
// 	            '_builtin' => false
// 	        );
// 	        $output = 'names'; // names or objects
// 	        $operator = 'and'; // 'and' or 'or'
// 	        $post_types = get_post_types($args,$output,$operator);
//
// 	        foreach ($post_types as $post_type) {
// 	            $page = add_submenu_page('edit.php?post_type=' . $post_type, __('Calendar', 'border-calendar'), __('Calendar', 'border-calendar'), 'edit_posts', 'cal_' . $post_type, 'borcal_list_admin');
// 	            add_action( "admin_print_scripts-$page", 'borcal_scripts' );
// 	        }
//
// 		}
    }
}

/*
 * This is a utility function to open a file add it to our
 * output stream.  We use this to embed JavaScript and CSS
 * files and cut down on the number of HTTP requests.
 */
function echoBorCalFile($myFile) {
    $fh = fopen($myFile, 'r');
    $theData = fread($fh, filesize($myFile));
    fclose($fh);
    echo $theData;
}

/*
 * This is the function that generates our admin page.  It adds the CSS files and
 * generates the divs that we need for the JavaScript to work.
 */
function borcal_list_admin() {
    include_once('borcal.php');

    /*
     * We want to count the number of times they load the calendar
     * so we only show the feedback after they have been using it
     * for a little while.
     */
    $borcal_count = get_option("borcal_count");
    if ($borcal_count == '') {
        $borcal_count = 0;
        add_option("borcal_count", $borcal_count, "", "yes");
    }
    if (get_option("borcal_do_feedback") != "done") {
        $borcal_count++;
        update_option("borcal_count", $borcal_count);
    }


    /*
     * This section of code embeds certain CSS and
     * JavaScript files into the HTML.  This has the
     * advantage of fewer HTTP requests, but the
     * disadvantage that the browser can't cache the
     * results.  We only do this for files that will
     * be used on this page and nowhere else.
     */

    echo '<!-- This is the styles from time picker.css -->';
    echo '<style type="text/css">';
    echoBorCalFile(dirname( __FILE__ ) . "/lib/timePicker.css");
    echo '</style>';

    echo '<!-- This is the styles from humanmsg.css -->';
    echo '<style type="text/css">';
    echoBorCalFile(dirname( __FILE__ ) . "/lib/humanmsg.css");
    echo '</style>';

    echo '<!-- This is the styles from borcal.css -->';
    echo '<style type="text/css">';
    echoBorCalFile(dirname( __FILE__ ) . "/borcal.css");
    echo '</style>';

    ?>

    <!-- This is just a little script so we can pass the AJAX URL and some localized strings -->
    <script type="text/javascript">
        jQuery(document).ready(function(){
            borcal.wp_nonce = '<?php echo wp_create_nonce("edit-calendar"); ?>';
            <?php
                if (get_option("borcal_weeks_pref") != "") {
            ?>
                borcal.weeksPref = <?php echo(get_option("borcal_weeks_pref")); ?>;
            <?php
                }
            ?>

            <?php
                if (get_option("borcal_author_pref") != "") {
            ?>
                borcal.authorPref = <?php echo(get_option("borcal_author_pref")); ?>;
            <?php
                }
            ?>

            <?php
                if (get_option("borcal_time_pref") != "") {
            ?>
                borcal.timePref = <?php echo(get_option("borcal_time_pref")); ?>;
            <?php
                }
            ?>

            <?php
                if (get_option("borcal_kind_pref") != "") {
            ?>
                borcal.kindPref = <?php echo(get_option("borcal_kind_pref")); ?>;
            <?php
                }
            ?>

            <?php
                if (get_option("borcal_do_feedback") != "done") {
            ?>
                // DHARMAN: Commenting th following line is usefull to inhibit the feedback request...
                // borcal.doFeedbackPref = true;
                borcal.visitCount = <?php echo(get_option("borcal_count")); ?>;
            <?php
                }
            ?>

            borcal.startOfWeek = <?php echo(get_option("start_of_week")); ?>;
            borcal.timeFormat = "<?php echo(get_option("time_format")); ?>";
            borcal.previewDateFormat = "MMMM d";

            /*
             * We want to show the day of the first day of the week to match the user's
             * country code.  The problem is that we can't just use the WordPress locale.
             * If the locale was fr-FR so we started the week on Monday it would still
             * say Sunday was the first day if we didn't have a proper language bundle
             * for French.  Therefore we must depend on the language bundle writers to
             * specify the locale for the language they are adding.
             *
             */
            borcal.locale = '<?php echo(__('en-US', 'border-calendar')) ?>';

            /*
             * These strings are all localized values.  The WordPress localization mechanism
             * doesn't really extend to JavaScript so we localize the strings in PHP and then
             * pass the values to JavaScript.
             */

            borcal.str_by = <?php echo(borcal_json_encode(__('%1$s by %2$s', 'border-calendar'))) ?>;

            borcal.str_addScheduleLink = <?php echo(borcal_json_encode(__('New Schedule', 'border-calendar'))) ?>;

            borcal.str_draft = <?php echo(borcal_json_encode(__(' [DRAFT]', 'border-calendar'))) ?>;
            borcal.str_pending = <?php echo(borcal_json_encode(__(' [PENDING]', 'border-calendar'))) ?>;
            borcal.str_sticky = <?php echo(borcal_json_encode(__(' [STICKY]', 'border-calendar'))) ?>;
            borcal.str_draft_sticky = <?php echo(borcal_json_encode(__(' [DRAFT, STICKY]', 'border-calendar'))) ?>;
            borcal.str_pending_sticky = <?php echo(borcal_json_encode(__(' [PENDING, STICKY]', 'border-calendar'))) ?>;
            borcal.str_edit = <?php echo(borcal_json_encode(__('Edit'))) ?>;
            borcal.str_del = <?php echo(borcal_json_encode(__('Delete'))) ?>;
            borcal.str_republish = borcal.str_edit;
            borcal.str_status = <?php echo(borcal_json_encode(__('Status:', 'border-calendar'))) ?>;
            borcal.str_cancel = <?php echo(borcal_json_encode(__('Cancel', 'border-calendar'))) ?>;
            borcal.str_posttitle = <?php echo(borcal_json_encode(__('Title'))) ?>;
            borcal.str_postcontent = <?php echo(borcal_json_encode(__('Content', 'border-calendar'))) ?>;
            borcal.str_newschedule = <?php echo(borcal_json_encode(__('Add a new schedule on %s', 'border-calendar'))) ?>;
            borcal.str_newschedule_title = borcal.str_addScheduleLink ;
            borcal.str_update = <?php echo(borcal_json_encode(__('Update', 'border-calendar'))) ?>;
            borcal.str_publish = <?php echo(borcal_json_encode(__('Schedule', 'border-calendar'))) ?>;
            borcal.str_review = <?php echo(borcal_json_encode(__('Submit for Review', 'border-calendar'))) ?>;
            borcal.str_save = <?php echo(borcal_json_encode(__('Save'))) ?>;
            borcal.str_add = <?php echo(borcal_json_encode(__('Add'))) ?>;
            borcal.str_editschedule_title = <?php echo(borcal_json_encode(__('Edit Schedule').' '.__('%1$s - %2$s'))) ?>;
            borcal.str_scheduled = <?php echo(borcal_json_encode(__('Scheduled', 'border-calendar'))) ?>;

            borcal.str_del_msg1 = <?php echo(borcal_json_encode(__('You are about to delete this schedule.', 'border-calendar'))) ?>;
            borcal.str_del_msg2 = <?php echo(borcal_json_encode(__('Press No to stop, Yes to delete.', 'border-calendar'))) ?>;

            borcal.concurrency_error = <?php echo(borcal_json_encode(__('Looks like someone else already moved this post.', 'border-calendar'))) ?>;
            borcal.permission_error = <?php echo(borcal_json_encode(__('You do not have permission to edit posts.', 'border-calendar'))) ?>;
            borcal.checksum_error = <?php echo(borcal_json_encode(__('Invalid checksum for post. This is commonly a cross-site scripting error.', 'border-calendar'))) ?>;
            borcal.general_error = <?php echo(borcal_json_encode(__('There was an error contacting your blog.', 'border-calendar'))) ?>;

            borcal.str_screenoptions = <?php echo(borcal_json_encode(__('Screen Options', 'border-calendar'))) ?>;
            borcal.str_optionscolors = <?php echo(borcal_json_encode(__('Colors', 'border-calendar'))) ?>;
            borcal.str_optionsdraftcolor = <?php echo(borcal_json_encode(__('Drafts: ', 'border-calendar'))) ?>;
            borcal.str_apply = <?php echo(borcal_json_encode(__('Apply', 'border-calendar'))) ?>;
            borcal.str_show_title = <?php echo(borcal_json_encode(__('Show on screen', 'border-calendar'))) ?>;
            borcal.str_opt_weeks = <?php echo(borcal_json_encode(' '.__('weeks at a time', 'border-calendar'))) ?>;
            borcal.str_show_opts = <?php echo(borcal_json_encode(__('Show in Calendar Cell', 'border-calendar'))) ?>;
            borcal.str_opt_author = <?php echo(borcal_json_encode(__('Author', 'border-calendar'))) ?>;
            borcal.str_opt_kind = <?php echo(borcal_json_encode(__('Kind', 'border-calendar'))) ?>;
            borcal.str_opt_time = <?php echo(borcal_json_encode(__('Time of day', 'border-calendar'))) ?>;
            borcal.str_fatal_error = <?php echo(borcal_json_encode(__('An error occurred while loading the calendar: ', 'border-calendar'))) ?>;

            borcal.str_weekserror = <?php echo(borcal_json_encode(__('The calendar can only show between 1 and 5 weeks at a time.', 'border-calendar'))) ?>;
            borcal.str_weekstt = <?php echo(borcal_json_encode(__('Select the number of weeks for the calendar to show.', 'border-calendar'))) ?>;

            borcal.str_feedbackmsg = <?php echo(borcal_json_encode(__('<div id="feedbacksection">' .
             '<h2>Help us Make the Editorial Calendar Better</h2>' .
             'We are always trying to improve the Editorial Calendar and you can help. May we collect some data about your blog and browser settings to help us improve this plugin?  We\'ll only do it once and your blog will show up on our <a target="_blank" href="http://www.zackgrossbart.com/borcal/mint/">Editorial Calendar Statistics page</a>.<br /><br />' .
             '<button class="button-secondary" onclick="borcal.doFeedback();">Collect Anonymous Data</button> ' .
             '<a href="#" id="nofeedbacklink" onclick="borcal.noFeedback(); return false;">No thank you</a></div>', 'border-calendar'))) ?>;

            borcal.str_feedbackdone = <?php echo(borcal_json_encode(__('<h2>We\'re done</h2>We\'ve finished collecting data.  Thank you for helping us make the calendar better.', 'border-calendar'))) ?>;
        });
    </script>

    <style type="text/css">
        .loadingclass > .postlink, .loadingclass:hover > .postlink, .tiploading {
            background-image: url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/../../../wp-admin/images/loading.gif")); ?>');
        }

        #loading {
            background-image: url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/../../../wp-admin/images/loading.gif")); ?>');
        }

        #tipclose {
            background-image: url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/images/tip_close.png")); ?>');
        }

        #tooltip {
            background: white url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/../../../wp-admin/images/gray-grad.png")); ?>') repeat-x left top;
        }

        .month-present .daylabel, .firstOfMonth .daylabel, .dayheadcont {
            background: #6D6D6D url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/../../../wp-admin/images/gray-grad.png")); ?>') repeat-x scroll left top;
        }

        .today .daylabel {
            background: url('<?php echo(path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/../../../wp-admin/images/button-grad.png")); ?>') repeat-x left top;
        }

    </style>

    <?php
    echo '<!-- This is the code from borcal.js -->';
    echo '<script type="text/javascript">';
    echoBorCalFile(dirname( __FILE__ ) . "/borcal.js");
    echo '</script>';

    ?>

    <div class="wrap">
        <div class="icon32" id="icon-edit"><br/></div>
        <h2 id="borcal_main_title"><?php echo(' Border Radio - '.__('palimpsest', 'border-calendar')); ?></h2>

        <div id="loadingcont">
            <div id="loading"> </div>
        </div>

        <div id="topbar" class="tablenav">
            <div id="topleft" class="tablenav-pages">
                <h3>
                    <a href="#" title="<?php echo(__('Jump back', 'border-calendar')) ?>" class="prev page-numbers" id="prevmonth">&laquo;</a>
                    <span id="currentRange"></span>
                    <a href="#" title="<?php echo(__('Skip ahead', 'border-calendar')) ?>" class="next page-numbers" id="nextmonth">&raquo;</a>
                </h3>
            </div>

            <div id="topright">
                <button class="save button" title="<?php echo(__('Scroll the calendar and make the today visible', 'border-calendar')) ?>" id="moveToToday"><?php echo(__('Show', 'border-calendar').' '.__('Today', 'border-calendar')) ?></button>
            </div>
        </div>

        <div id="cal_cont">
            <div id="borcal_scrollable" class="borcal_scrollable vertical">
                <div id="cal"></div>
            </div>
        </div>

		<div id="tooltip" style="display:none;">
			<div id="tooltiphead">
				<div id="tooltiptitle"><?php _e('Edit Post', 'border-calendar') ?></div>
				<a href="#" id="tipclose" onclick="borcal.hideForm(); return false;" title="<?=__('Close');?>"> </a>
			</div>

			<div class="tooltip inline-edit-row">

                <fieldset>

                <label>
					<span class="title"><?php _e('Title', 'border-calendar') ?></span>
					<span class="input-text-wrap">

<select onchange="borcal.pollo();" class="ptitle" id="borcal-title-new-field" name="title" >
	<option default value="Musica Libera">Musica Libera</option>
	<option default value="After Mood">After Mood</option>
	<option default value="Interno Notte">Interno Notte</option>
<?php
	global $post;

// 	$allPrograms = array();

	$args = array(
		'posts_per_page' => -1, // Nota: senza limita i risultati a 10
				'post_type' => 'programmi',
				'post_status' => 'publish',
				'orderby' => 'date',
				'order' => 'DESC',
		'paged' => $paged
	);
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
		echo '	<option value="'.$post->post_title.'">'.$post->post_title.'</option>\n';
// $post->post_name
// get_post_meta($post->ID, '_yoast_wpseo_metadesc', true)
// get_post_meta($post->ID, 'metakey_feed', true)
	endwhile;

?>

</select>
<!-- <input type="text" class="ptitle" id="borcal-title-new-field" name="title" /> -->

</span>
    			</label>

                <label>
                    <span class="title"><?php _e('Content', 'border-calendar') ?></span>
<?php  /*
                       <div id="cal_mediabar">
    						<?php if ( current_user_can( 'upload_files' ) ) : ?>
    							<div id="media-buttons" class="hide-if-no-js">
    								<?php do_action( 'media_buttons' ); ?>
    							</div>
    						<?php endif; ?>
    				   </div>
/*/ ?>
                    <span class="input-text-wrap"><textarea cols="15" rows="7" id="content" name="content"></textarea></span>
                </label>

                <label>
                    <span class="title"><?php _e('Begin', 'border-calendar') ?></span>
                    <span class="input-text-wrap"><input type="text" class="ptitle" id="borcal-beginTime" name="beginTime" value="" size="8" readonly="true" maxlength="8" autocomplete="off" /></span>
                </label>

                <label>
                    <span class="title"><?php _e('End', 'border-calendar') ?></span>
                    <span class="input-text-wrap"><input type="text" class="ptitle" id="borcal-endTime" name="endTime" value="" size="8" readonly="true" maxlength="8" autocomplete="off" /></span>
                </label>

                <label>
                    <span class="title"><?php _e('Kind', 'border-calendar') ?></span>
                    <span class="input-text-wrap">
                        <select name="kind" id="borcal-schedule-kind">
                            <option selected value="--"><?php _e('--', 'border-calendar') ?></option>
                            <option value="playlist"><?php _e('Playlist', 'border-calendar') ?></option>
                            <option value="broadcast"><?php _e('Broadcast', 'border-calendar') ?></option>
                            <option value="replica"><?php _e('Replica', 'border-calendar') ?></option>
                            <option value="live"><?php _e('Live', 'border-calendar') ?></option>
                        </select>
                    </span>
				</label>

<?php /*                <label>
                    <span class="title"><?php _e('Author', 'border-calendar') ?></span>
                    <span id="borcal-author-p"><!-- Placeholder for the author's name, added dynamically --></span>
                </label>
*/ ?>
                </fieldset>

				<p class="submit inline-edit-save" id="edit-slug-buttons">
                    <a class="button-primary disabled" id="newPostScheduleButton" href="#"><?php _e('Schedule', 'border-calendar') ?></a>
                    <a href="#" onclick="borcal.hideForm(); return false;" class="button-secondary cancel"><?php _e('Cancel', 'border-calendar') ?></a>
                </p>

                <input type="hidden" id="borcal-date" name="date" value="" />
                <input type="hidden" id="borcal-id" name="id" value="" />

            </div><?php // end .tooltip ?>
        </div><?php // end #tooltip ?>

    </div><?php // end .wrap ?>

    <?php
}

/*
 * We use these variables to hold the post dates for the filter when
 * we do our post query.
 */
$borcal_startDate;
$borcal_endDate;

/*
 * When we get a set of posts to populate the calendar we don't want
 * to get all of the posts.  This filter allows us to specify the dates
 * we want.
 */
function borcal_filter_where($where = '') {
    global $borcal_startDate, $borcal_endDate;
    //posts in the last 30 days
    //$where .= " AND post_date > '" . date('Y-m-d', strtotime('-30 days')) . "'";
    //posts  30 to 60 days old
    //$where .= " AND post_date >= '" . date('Y-m-d', strtotime('-60 days')) . "'" . " AND post_date <= '" . date('Y-m-d', strtotime('-30 days')) . "'";
    //posts for March 1 to March 15, 2009
    $where .= " AND post_date >= '" . $borcal_startDate . "' AND post_date < '" . $borcal_endDate . "'";
    return $where;
}

/*
 * This function adds all of the JavaScript files we need.
 *
 */
function borcal_scripts() {
    /*
     * To get proper localization for dates we need to include the correct JavaScript file for the current
     * locale.  We can do this based on the locale in the localized bundle to make sure the date locale matches
     * the locale for the other strings.
     */
    wp_enqueue_script( "date", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/languages/date-".__('en-US', 'border-calendar').".js"), array( 'jquery' ) );
    wp_enqueue_script( 'jquery' );
    wp_enqueue_script( 'jquery-ui-draggable' );
    wp_enqueue_script( 'jquery-ui-droppable' );

	//wp_enqueue_script( "date-extras", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/date.extras.js"), array( 'jquery' ) );

    wp_enqueue_script( "borcal-lib", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/borcallib.min.js"), array( 'jquery' ) );

    if ($_GET['qunit']) {
        wp_enqueue_script( "qunit", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/qunit.js"), array( 'jquery' ) );
        wp_enqueue_script( "borcal-test", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/borcal_test.js"), array( 'jquery' ) );
    }

    return;

    /*
     * If you're using one of the specific libraries you should comment out the two lines
     * above this comment.
     */
    wp_enqueue_script( "bgiframe", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/jquery.bgiframe.js"), array( 'jquery' ) );
    wp_enqueue_script( "humanMsg", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/humanmsg.js"), array( 'jquery' ) );
    wp_enqueue_script( "jquery-timepicker", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/jquery.timepicker.js"), array( 'jquery' ) );

    wp_enqueue_script( "scrollable", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/tools.scrollable-1.1.2.js"), array( 'jquery' ) );
    wp_enqueue_script( "mouse-wheel", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/tools.scrollable.mousewheel-1.0.1.js"), array( 'jquery' ) );

    wp_enqueue_script( "json-parse2", path_join(WP_PLUGIN_URL, basename( dirname( __FILE__ ) )."/lib/json2.js"), array( 'jquery' ) );
}

function borcal_isScheduleMovable($schedule = NULL)
{
	$retValue = 'no';
	if($schedule != NULL)
	{
		$date = str_split($schedule['isoDate'], 2);
		$time = $pieces = explode(".", $schedule['beginTime']);
		if(mktime()+(UTC_OFFSET*60*60)+1800 < mktime($time[0], $time[1], 0, $date[2]  , $date[3], $date[0].$date[1]))
			$retValue = 'yes';
	}
	return $retValue;
}

/*
 * This is an AJAX call that gets the posts between the from date
 * and the to date.
 */
function borcal_posts() {
    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();
    if (!borcal_checknonce()) {
        die();
    }

    global $borcal_startDate, $borcal_endDate;
    $borcal_startDate = isset($_GET['from'])?$_GET['from']:null;
    $borcal_endDate = isset($_GET['to'])?$_GET['to']:null;

		$firstDate = strtotime($borcal_startDate);
		$lastDate = strtotime($borcal_endDate);
		$nrSeconds = $lastDate - $firstDate;
		$nrWeeks = abs($nrSeconds);
		$nrWeeks = floor($nrSeconds / 604800);

		$schedules = Array();

		for($i=0;$i<$nrWeeks;$i++)
		{
			$palimpsest = new PalimpsestXML(strtotime($borcal_startDate."+$i week"));
			$tmpSchedules = $palimpsest->getSchedules(DESC_ORDER);
			$schedules = array_merge($schedules,$tmpSchedules);
		}

    ?>[
    <?php
    $size = count($schedules);
    for($i = 0; $i < $size; $i++) {
        $post = $schedules[$i];
				$post['editable'] = borcal_isScheduleMovable($post);


// 				$post['editable'] = 'yes';
// POST DEL GIORNO
        borcal_scheduleJSON($post, $i < $size - 1);
    }
    ?> ]
    <?php

    die();
}

/*
 * This is for an AJAX call that returns a post with the specified ID
 */
function borcal_getpost() {
	header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

	// If nonce fails, return
	if (!borcal_checknonce()) die();
	$post_id = intval($_GET['postid']);

	// If a proper post_id wasn't passed, return
	if(!$post_id) die();

//     $args = array(
//         'post__in' => array($post_id)
//     );


	$year=substr($post_id, 0,4);
	$week=substr($post_id, 4,2);

	$Jan1 = mktime(1,1,1,1,1,$year);
	$MondayOffset = (11-date('w',$Jan1))%7-3;
	$weekStart = strtotime(($week-1) . ' weeks '.$MondayOffset.' days', $Jan1);

	$palimpsest = new PalimpsestXML($weekStart);
// exec('echo "POLLO9: '.date('Y-m-d H:i',$palimpsest->getTimeStamp()).'">>/tmp/pollo');
	$schedule = $palimpsest->getSchedulebyId($post_id);
// exec('echo "POLLO1: '.$schedule['beginTime'].'">>/tmp/pollo');

	$schedule['editable'] = borcal_isScheduleMovable($schedule);

	// get_post and setup_postdata don't get along, so we're doing a mini-loop
	if(!is_null($schedule)) :
			?>
			{
			"post" :
				<?php
 				borcal_scheduleJSON($schedule, false, true);
				?>
			}
			<?php
 endif;

	die();
}

function borcal_json_encode($string) {
    /*
     * WordPress escapes apostrophe's when they show up in post titles as &#039;
     * This is the HTML ASCII code for a straight apostrophe.  This works well
     * with Firefox, but IE complains with a very unhelpful error message.  We
     * can replace them with a right curly apostrophe since that works in IE
     * and Firefox.  It is also a little nicer typographically.
     */
    return json_encode(str_replace("&#039;", "&#146;", $string));
}

/*
 * This helper functions gets the plural name of the post
 * type specified by the post_type parameter.
 */
function borcal_get_posttype_multiplename() {

    $post_type = $_GET['post_type'];
    if (!$post_type) {
        return 'Posts';
    }

    $postTypeObj = get_post_type_object($post_type);
    return $postTypeObj->labels->name;
}

/*
 * This helper functions gets the singular name of the post
 * type specified by the post_type parameter.
 */

function borcal_get_posttype_singlename() {

    $post_type = $_GET['post_type'];
    if (!$post_type) {
        return 'Post';
    }

    $postTypeObj = get_post_type_object($post_type);
    return $postTypeObj->labels->singular_name;
}

/*
 * This function sets up the post data and prints out the values we
 * care about in a JSON data structure.  This prints out just the
 * value part. If $fullPost is set to true, post_content is also returned.
 */
function borcal_scheduleJSON($post, $addComma = true, $fullSchedule = false) {
    ?>
        {
            "id" : "<?=strval($post['id'])?>",
            "date" : "<?=strval($post['date'])?>",
            "beginTime" : "<?=strval($post['beginTime'])?>",
            "endTime" : "<?=strval(($post['endTime'] == T23_59)?T00_00:$post['endTime'])?>",
            "formattedtime" : "<?=$post['beginTime'].'-'.$post['endTime']?>",
            "kind" : "<?=$post['kind']?>",
            "title" : <?=borcal_json_encode($post['title'])?>,
            "author" : "<?=$post['author']?>",
            "typeTitle" : "<?=$post['typeTitle']?>",
            "editable" : "<?=$post['editable']?>",
            "editlink" : "http://border-radio.it",
            "dellink" : "javascript:borcal.deletePost(<?=strval($post['id'])?>)"

			<?php if($fullSchedule) : ?>
			 ,"content" : <?=borcal_json_encode($post['content'])?>

			<?php endif; ?>
        }
    <?php
    if ($addComma) {
        ?>,<?php
    }
}

/*
 * This is a helper AJAX function to delete a post. It gets called
 * when a user clicks the delete button, and allows the user to
 * retain their position within the calendar without a page refresh.
 * It is not called unless the user has permission to delete the post
 */
function borcal_deletepost() {
	if (!borcal_checknonce()) {
		die();
	}

	header("Content-Type: application/json");
	borcal_addNoCacheHeaders();

	$borcal_postid = isset($_GET['postid'])?$_GET['postid']:null;
	$year = substr($borcal_postid, 0, 4);
	$week = substr($borcal_postid, 4, 2);
	$day = intval(substr($borcal_postid, 6, 1)-1);

	$day_ts = strtotime($year . '-01-04');  // 01-04 is *always* in week #1
	while (date('w', $day_ts) != '1')
		$day_ts = strtotime('-1 day', $day_ts);
	$day_ts = strtotime('+' . ($week - 1) . ' weeks', $day_ts);

	$timestamp = strtotime('+'.$day.' days', $day_ts);

	$palimpsest = new PalimpsestXML($timestamp);

	$schedule = $palimpsest->delSchedule($borcal_postid);
	$palimpsest->save();

	$title = $schedule['title'];
	$date = date('dmY', $timestamp);

//	return the following info so that jQuery can then remove post from borcal display :
?>
{
    "post" :
	{
        "date" : "<?php echo $date ?>",
        "title" : "<?php echo $title ?>",
        "id" : "<?php echo $borcal_postid ?>"
	}
}
<?php

	die();
}

/*
 * This is a helper AJAX function to change the title of a post.  It
 * gets called from the save button in the tooltip when you change a
 * post title in a calendar.
 */
function borcal_changetitle() {
    if (!borcal_checknonce()) {
        die();
    }

    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    $borcal_postid = isset($_GET['postid'])?$_GET['postid']:null;
    $borcal_newTitle = isset($_GET['title'])?$_GET['title']:null;

    $post = get_post($borcal_postid, ARRAY_A);
    setup_postdata($post);

    $post['post_title'] = $borcal_newTitle;

    /*
     * Now we finally update the post into the database
     */
    wp_update_post( $post );

    /*
     * We finish by returning the latest data for the post in the JSON
     */
    global $post;
    $args = array(
        'posts_id' => $borcal_postid,
    );

    $post = get_post($borcal_postid);

    ?>{
        "post" :
    <?php

        borcal_postJSON($post);

    ?>
    }
    <?php


    die();
}

/*
 * This is a helper function to create a new blank draft
 * post on a specified date.
 */
function borcal_newdraft() {
    if (!borcal_checknonce()) {
        die();
    }

    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    $borcal_date = isset($_POST["date"])?$_POST["date"]:null;

    $my_post = array();
    $my_post['post_title'] = isset($_POST["title"])?$_POST["title"]:null;
    $my_post['post_content'] = isset($_POST["content"])?$_POST["content"]:null;
    $my_post['post_kind'] = 'draft';

    $my_post['post_date'] = $borcal_date;
    $my_post['post_date_gmt'] = get_gmt_from_date($borcal_date);
    $my_post['post_modified'] = $borcal_date;
    $my_post['post_modified_gmt'] = get_gmt_from_date($borcal_date);

    // Insert the post into the database
    $my_post_id = wp_insert_post( $my_post );

    /*
     * We finish by returning the latest data for the post in the JSON
     */
    global $post;
    $post = get_post($my_post_id);

    ?>{
        "post" :
    <?php

        borcal_postJSON($post, false);

    ?>
    }
    <?php

    die();
}

/*
 * This is a helper function to create a new draft post on a specified date
 * or update an existing post
 */
function borcal_savepost() {

	if (!borcal_checknonce()) {
        die();
    }

    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    $my_post = array();
		$my_post['date'] = strval($_POST['date']);
		$palimpsest = new PalimpsestXML(strtotime($my_post['date']));
		$my_post['id'] = strval($_POST['id']);
		$my_post['title'] = strval($_POST['title']);
		$my_post['content'] = strval($_POST['content']);
		$my_post['beginTime'] = strval($_POST['beginTime']);
		$my_post['endTime'] = strval(($_POST['endTime'] == T23_59)?T00_00:$_POST['endTime']);
		$my_post['kind'] = strval($_POST['kind']);
		$my_post['author'] = strval('dharman');
		$my_post['editable'] = 'yes';

	$day = date('l', strtotime($my_post['date']));
	if($_POST['action'] === 'add')
	{
		$my_post['id'] = $palimpsest->setSchedule($day, $my_post['beginTime'], $my_post['endTime'], $my_post['title'], str_replace(array('\"',"\'"),array("'",'"'),$my_post['content']), 'POLLO', $my_post['kind'],false);
// exec('echo "POLLOAdd: '.$day.'-'.$my_post['beginTime'].'-'.$my_post['endTime'].'-'.$my_post['title'].'-'.$my_post['content'].'-'.'POLLO'.'-'.$my_post['kind'].'">>/tmp/pollo');
		$palimpsest->save();
	}
	elseif($_POST['action'] == 'edit')
	{
		$palimpsest->setSchedule($day, $my_post['beginTime'], $my_post['endTime'], $my_post['title'], $my_post['content'], 'POLLO', $my_post['kind'],true);
// exec('echo "POLLOEdit: '.$day.'-'.$my_post['beginTime'].'-'.$my_post['endTime'].'-'.$my_post['title'].'-'.$my_post['content'].'-'.'POLLO'.'-'.$my_post['kind'].'">>/tmp/pollo');
		$palimpsest->save();
	}

	echo '{"post" :';
	borcal_scheduleJSON($my_post, false);
	echo '}';
	die();
}

/*
 * This function checks the nonce for the URL.  It returns
 * true if the nonce checks out and outputs a JSON error
 * and returns false otherwise.
 */
function borcal_checknonce() {
    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    global $BORCAL_NONCE_ERROR;
    if (!wp_verify_nonce($_REQUEST['_wpnonce'], 'edit-calendar')) {
       /*
         * This is just a sanity check to make sure
         * this isn't a CSRF attack.  Most of the time this
         * will never be run because you can't see the calendar unless
         * you are at least an editor
         */
        ?>
        {
            "error": <?php echo($BORCAL_NONCE_ERROR); ?>
        }
        <?php
        return false;
    }
    return true;
}

/*
 * This function changes the date on a post.  It does optimistic
 * concurrency checking by comparing the original post date from
 * the browser with the one from the database.  If they don't match
 * then it returns an error code and the updated post data.
 *
 * If the call is successful then it returns the updated post data.
 */
function borcal_changedate() {
    if (!borcal_checknonce()) {
        die();
    }
    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    global $borcal_startDate, $borcal_endDate;
    $borcal_postid = isset($_GET['postid'])?$_GET['postid']:null;
    $borcal_newDate = isset($_GET['newdate'])?$_GET['newdate']:null;
    $borcal_oldDate = isset($_GET['olddate'])?$_GET['olddate']:null;
    $borcal_postKind = isset($_GET['postKind'])?$_GET['postKind']:null;

    if (!current_user_can('edit_post', $borcal_postid)) {
        global $BORCAL_PERMISSION_ERROR;
        /*
         * This is just a sanity check to make sure that the current
         * user has permission to edit posts.  Most of the time this
         * will never be run because you can't see the calendar unless
         * you are at least an editor
         */
        ?>
        {
            "error": <?php echo($BORCAL_PERMISSION_ERROR); ?>,
        <?php

        global $post;
        $args = array(
            'posts_id' => $borcal_postid,
        );

        $post = get_post($borcal_postid);
        ?>
            "post" :
        <?php
            borcal_postJSON($post, false, true);
        ?> }

        <?php
        die();
    }

    $post = get_post($borcal_postid, ARRAY_A);
    setup_postdata($post);

    /*
     * We are doing optimistic concurrency checking on the dates.  If
     * the user tries to move a post we want to make sure nobody else
     * has moved that post since the page was last updated.  If the
     * old date in the database doesn't match the old date from the
     * browser then we return an error to the browser along with the
     * updated post data.
     */
     if (date('Y-m-d', strtotime($post['post_date'])) != date('Y-m-d', strtotime($borcal_oldDate))) {
        global $BORCAL_CONCURRENCY_ERROR;
        ?> {
            "error": <?php echo($BORCAL_CONCURRENCY_ERROR); ?>,
        <?php

        global $post;
        $args = array(
            'posts_id' => $borcal_postid,
        );

        $post = get_post($borcal_postid);
        ?>
            "post" :
        <?php
            borcal_postJSON($post, false, true);
        ?> }

        <?php
        die();
    }

    /*
     * Posts in WordPress have more than one date.  There is the GMT date,
     * the date in the local time zone, the modified date in GMT and the
     * modified date in the local time zone.  We update all of them.
     */
    $post['post_date_gmt'] = $post['post_date'];

    /*
     * When a user creates a draft and never sets a date or publishes it
     * then the GMT date will have a timestamp of 00:00:00 to indicate
     * that the date hasn't been set.  In that case we need to specify
     * an edit date or the wp_update_post function will strip our new
     * date out and leave the post as publish immediately.
     */
    $needsEditDate = strpos($post['post_date_gmt'], "0000-00-00 00:00:00") === 0;

    $updated_post = array();
    $updated_post['ID'] = $borcal_postid;
    $updated_post['post_date'] = $borcal_newDate . substr($post['post_date'], strlen($borcal_newDate));
    if ($needsEditDate != -1) {
        $updated_post['edit_date'] = $borcal_newDate . substr($post['post_date'], strlen($borcal_newDate));
    }

    /*
     * We need to make sure to use the GMT formatting for the date.
     */
    $updated_post['post_date_gmt'] = get_gmt_from_date($updated_post['post_date']);
    $updated_post['post_modified'] = $borcal_newDate . substr($post['post_modified'], strlen($borcal_newDate));
    $updated_post['post_modified_gmt'] = get_gmt_from_date($updated_post['post_date']);

    if ( $borcal_postKind != $post['post_kind'] ) {
        /*
         * We only want to update the post status if it has changed.
         * If the post status has changed that takes a few more steps
         */
        wp_transition_post_status($borcal_postKind, $post['post_kind'], $post);
        $updated_post['post_kind'] = $borcal_postKind;

        // Update counts for the post's terms.
        foreach ( (array) get_object_taxonomies('post') as $taxonomy ) {
            $tt_ids = wp_get_object_terms($post_id, $taxonomy, 'fields=tt_ids');
            wp_update_term_count($tt_ids, $taxonomy);
        }

        do_action('edit_post', $borcal_postid, $post);
        do_action('save_post', $borcal_postid, $post);
        do_action('wp_insert_post', $borcal_postid, $post);
    }

    /*
     * Now we finally update the post into the database
     */
    wp_update_post( $updated_post );

    /*
     * We finish by returning the latest data for the post in the JSON
     */
    global $post;
    $args = array(
        'posts_id' => $borcal_postid,
    );

    $post = get_post($borcal_postid);
    ?>{
        "post" :

    <?php
        borcal_postJSON($post, false, true);
    ?>}
    <?php

    die();
}

/*
 * This function saves the preferences
 */
function borcal_saveoptions() {
    if (!borcal_checknonce()) {
        die();
    }

    header("Content-Type: application/json");
    borcal_addNoCacheHeaders();

    /*
     * The number of weeks preference
     */
    $borcal_weeks = isset($_GET['weeks'])?$_GET['weeks']:null;
    if ($borcal_weeks != null) {
        add_option("borcal_weeks_pref", $borcal_weeks, "", "yes");
        update_option("borcal_weeks_pref", $borcal_weeks);
    }

    /*
     * The show author preference
     */
    $borcal_author = isset($_GET['author-hide'])?$_GET['author-hide']:null;
    if ($borcal_author != null) {
        add_option("borcal_author_pref", $borcal_author, "", "yes");
        update_option("borcal_author_pref", $borcal_author);
    }

    /*
     * The show status preference
     */
    $borcal_kind = isset($_GET['kind-hide'])?$_GET['kind-hide']:null;
    if ($borcal_kind != null) {
        add_option("borcal_kind_pref", $borcal_kind, "", "yes");
        update_option("borcal_kind_pref", $borcal_kind);
    }

    /*
     * The show time preference
     */
    $borcal_time = isset($_GET['time-hide'])?$_GET['time-hide']:null;
    if ($borcal_time != null) {
        add_option("borcal_time_pref", $borcal_time, "", "yes");
        update_option("borcal_time_pref", $borcal_time);
    }

    /*
     * The borcal feedback preference
     */
    $borcal_feedback = isset($_GET['dofeedback'])?$_GET['dofeedback']:null;
    if ($borcal_feedback != null) {
        add_option("borcal_do_feedback", $borcal_feedback, "", "yes");
        update_option("borcal_do_feedback", $borcal_feedback);
    }


    /*
     * We finish by returning the latest data for the post in the JSON
     */
    ?>{
        "update" : "success"
    }
    <?php

    die();
}

/*
 * Add the no cache headers to make sure that our responses aren't
 * cached by the browser.
 */
function borcal_addNoCacheHeaders() {
    header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past
}
