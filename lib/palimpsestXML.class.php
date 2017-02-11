<?php

//BorderRadio URL
define('RADIO_URL', 'http://border-radio.it');

define('ASC_ORDER', 'ascSort');
define('DESC_ORDER', 'descSort');
//Valid days of palimpsest...
define('MONDAY', 'Monday');
define('TUESDAY', 'Tuesday');
define('WEDNESDAY', 'Wednesday');
define('THURSDAY', 'Thursday');
define('FRIDAY', 'Friday');
define('SATURDAY', 'Saturday');
define('SUNDAY', 'Sunday');

//Valid times of palimpsest...
define('TUNDEF', '--.--');
define('T00_00', '00.00');
define('T00_30', '00.30');
define('T01_00', '01.00');
define('T01_30', '01.30');
define('T02_00', '02.00');
define('T02_30', '02.30');
define('T03_00', '03.00');
define('T03_30', '03.30');
define('T04_00', '04.00');
define('T04_30', '04.30');
define('T05_00', '05.00');
define('T05_30', '05.30');
define('T06_00', '06.00');
define('T06_30', '06.30');
define('T07_00', '07.00');
define('T07_30', '07.30');
define('T08_00', '08.00');
define('T08_30', '08.30');
define('T09_00', '09.00');
define('T09_30', '09.30');
define('T10_00', '10.00');
define('T10_30', '10.30');
define('T11_00', '11.00');
define('T11_30', '11.30');
define('T12_00', '12.00');
define('T12_30', '12.30');
define('T13_00', '13.00');
define('T13_30', '13.30');
define('T14_00', '14.00');
define('T14_30', '14.30');
define('T15_00', '15.00');
define('T15_30', '15.30');
define('T16_00', '16.00');
define('T16_30', '16.30');
define('T17_00', '17.00');
define('T17_30', '17.30');
define('T18_00', '18.00');
define('T18_30', '18.30');
define('T19_00', '19.00');
define('T19_30', '19.30');
define('T20_00', '20.00');
define('T20_30', '20.30');
define('T21_00', '21.00');
define('T21_30', '21.30');
define('T22_00', '22.00');
define('T22_30', '22.30');
define('T23_00', '23.00');
define('T23_30', '23.30');
define('T23_59', '23.59');

//Valid schedule types of palimpsest...
define('PLAYLIST', 'playlist');
define('BROADCAST', 'broadcast');
define('REPLICA', 'replica');
define('LIVE', 'live');



/* CLASS PalimpsestXML definition */
class PalimpsestXML extends DOMElement{

	const WEEK_ELEMENT = 'settimana';
	const DAY_ELEMENT = 'giorno';
	const TIME_ELEMENT = 'ora';
	const SCHEDULE_ELEMENT = 'programma';
	const TITLE_ELEMENT = 'titolo';
	const DESCRIPTION_ELEMENT = 'descrizione';

	var $xmlDoc;
	var $xmlRoot;
	var $rootPath;
	var $xmlFile;
	var $xmlTemplate;
	var $usingTemplate;
	var $timeOffset;
	var $curWeek;
	var $curYear;
	var $curWeekDays;

	//function __construct($week = NULL, $year = NULL)
	function __construct($timestamp = NULL)
	{
		if(!defined('UTC_OFFSET'))
			define('UTC_OFFSET', 0);

		$this->timeOffset = UTC_OFFSET*60*60;
		$this->usingTemplate = false;

		if($timestamp == NULL) $timestamp = mktime()+$this->timeOffset;
		$this->curWeek = date('W', $timestamp);
		$this->curYear = date('Y', $timestamp);

		$this->rootPath = $_SERVER['DOCUMENT_ROOT'].'/palimpsest';
		$this->xmlTemplate = $this->rootPath.'/palinsesto_YYYY-WW.xml';
		$this->xmlFile = $this->rootPath.'/palinsesto_'.$this->curYear.'-'.$this->curWeek.'.xml';
		if(!is_writable($this->xmlFile))
		{
			if(!is_writable($this->xmlTemplate))
				die('Unable to find a valid palimpsest file'/*.$this->xmlFile*/);
			$this->usingTemplate = true;
		}
		$this->weekToDates($this->curWeek,$this->curYear);
		$this->xmlDoc = new DOMDocument('1.0','UTF-8');
		$this->xmlDoc->preserveWhiteSpace = false;
		$this->xmlDoc->formatOutput = true;

		if(file_exists($this->xmlFile))
		{
			$this->xmlDoc->load($this->xmlFile);
		}
		else if(file_exists($this->xmlTemplate))
		{
			$this->xmlDoc->load($this->xmlTemplate);
		}
		else
		{
			$rootEl = $this->xmlDoc->createElement(self::WEEK_ELEMENT);
			$rootEl->setAttribute('id', $this->curYear.'-'.$this->curWeek);
			$this->xmlDoc->appendChild($rootEl);
		}

		$this->xpath = new DOMXPath($this->xmlDoc);
		$this->xmlRoot = $this->xmlDoc->documentElement;
		$this->constants = get_defined_constants(true);

		$query = '//settimana/*/*/programma';
		$entries = $this->xpath->query($query);
		foreach ($entries as $node) {
			$saneId = str_replace('ID_YYYYWW', $this->curYear.$this->curWeek, $node->getAttribute('id'));
			$node->setAttribute('id', $saneId);
		}

		$query = '//settimana/@id';
		$rootEl = $this->xpath->query($query);
		$rootEl->item(0)->nodeValue = $this->curYear.'-'.$this->curWeek;

		$query = '//settimana/giorno';
		$entries = $this->xpath->query($query);
		foreach ($entries as $node) {
// 			echo $node->getAttribute('id');
			$dayISO = $node->getAttribute('id');
			$node->setAttribute('date', $this->curWeekDays[$dayISO]);
		}
	} /* end constructor */

	public function dump()
	{
		return  $this->xmlDoc->saveXML();
	} /* end dump */

	private function weekToDates($week, $year)
	{
		$days[0]='Monday';
		$days[1]='Tuesday';
		$days[2]='Wednesday';
		$days[3]='Thursday';
		$days[4]='Friday';
		$days[5]='Saturday';
		$days[6]='Sunday';

		$day_ts = strtotime($year . '-01-04');  // 01-04 is *always* in week #1
		while (date('w', $day_ts) != '1')
				$day_ts = strtotime('-1 day', $day_ts);
		$day_ts = strtotime('+' . ($week - 1) . ' weeks', $day_ts);

		for($i=0; $i<7; $i++)
			$this->curWeekDays[$days[$i]] = date('Y-m-d',strtotime('+'.$i.' days', $day_ts));

	} /* end method weekToDates */

	public function normalizeTime($strTime, $useOffset = true)
	{
		$time = strtotime($strTime);
		if($useOffset) $time+=+$this->timeOffset;
		$hour = date('H', $time);
		$hour = sprintf('%02d', $hour);
		$minutes = date('i', $time);
		$minutes = sprintf('%02d', ($minutes-($minutes%30)));

          return $hour.'.'.$minutes;
	} /* end method normalizeTime */

	public function dayExists($dayName)
	{
		$rValue = NULL;

		$query = '//settimana/giorno[@id = "'.$dayName.'"]';

		$entries = $this->xpath->query($query);

		// We require that only one day for type exists in a week..
		if($entries->item(0) != NULL)
			$rValue = $entries->item(0);

		return $rValue;
	} /* end method dayExists */

	private function timeExists($dayName, $beginTimeValue, $endTimeValue)
	{
		$rValue = NULL;
// 		$timeValue = $this->normalizeTime($timeValue);
		if(in_array($dayName, $this->constants['user']))
		{
			$equal = ($beginTimeValue === $endTimeValue)?'':'=';
// 			$query = '//settimana/giorno[@id = "'.$dayName.'"]/ora[@begin <= "'.$beginTimeValue.'" and (@end >= "'.($endTimeValue+0.01).'" or @end = "00.00")]';
			$query = '//settimana/giorno[@id = "'.$dayName.'"]/ora[@begin <= "'.$beginTimeValue.'" and (@end >'.$equal.' "'. $endTimeValue      .'" or @end = "00.00")]';
// 			$query = '//settimana/giorno[@id = "'.$dayName.'"]/ora[@begin = "'.$beginTimeValue.'"]';
//settimana/giorno[@id = "Thursday"]/ora[@begin <= "22.00" and (@end >= "22.01" or @end = "00.00")]
			$entries = $this->xpath->query($query);

// foreach ($entries as $node) {
//   echo $node->nodeValue ;
// //   $newNode->appendChild($node) ;
// }
// echo "---";
// echo $entries->nodeValue;
// echo "$query<br>";
			// We require that only one slot in a specific time is available for every day..
			if($entries->item(0) != NULL)
			{
				$rValue = $entries->item(0);
			}
		}

		return $rValue;
	} /* end method timeExists */

	private function ascSort($a, $b)
	{
		return $this->sortComparison($a, $b);
	}

	private function descSort($a, $b)
	{
		return $this->sortComparison($b, $a);
	}

	private function sortComparison($a, $b)
	{
		$elemA = $a['isoDate'].$a['beginTime'];
		$elemB = $b['isoDate'].$b['beginTime'];

		return strnatcmp($elemA, $elemB);
	} /* end method sortComparison */

	public function getTimeStamp()
	{
		$nowstamp = mktime()+$this->timeOffset;
		return $nowstamp;
	} /* end method getTimeStamp */

	public function getSchedule($dayName = NULL, $beginTimeValue = NULL, $endTimeValue = NULL)
	{
		$rValue = NULL;
		$timeEl = NULL;

		$nowstamp = $this->getTimeStamp();
		if($beginTimeValue == NULL) $beginTimeValue = date('H:i', $nowstamp);
		$beginTimeValue = $this->normalizeTime($beginTimeValue, false);
		if($endTimeValue == NULL) $endTimeValue = date('H:i', $nowstamp);
		$endTimeValue = $this->normalizeTime($endTimeValue, false);
		if($dayName == NULL) $dayName = date('l', $nowstamp);

		$timeEl =  $this->timeExists($dayName, $beginTimeValue, $endTimeValue);
// echo $timeEl->getAttribute('begin');
		$tpl='';
		if($this->usingTemplate) $tpl='*';

		$rValue['date'] = $this->curWeekDays[$dayName];
		if($timeEl != NULL)
		{
			$rValue['beginTime'] = $timeEl->getAttribute('begin');
			$rValue['endTime'] = $timeEl->getAttribute('end');
			if($rValue['endTime'] == T00_00) $rValue['endTime'] = T23_59;
			$schedule = $timeEl->getElementsByTagName(self::SCHEDULE_ELEMENT);
			$schedule = $schedule->item(0);

			if(isset($schedule->nodeName))
			{
				$rValue['kind'] = $schedule->getAttribute('type');
				$rValue['url'] = $schedule->getAttribute('url');
				$tmpValue = $schedule->getElementsByTagName(self::TITLE_ELEMENT)->item(0)->nodeValue;
				$rValue['title'] = $tpl.((isset($tmpValue))?$tmpValue:'').$tpl;

				$tmpValue = $schedule->getElementsByTagName(self::DESCRIPTION_ELEMENT)->item(0)->nodeValue;
				$rValue['description'] = $tpl.((isset($tmpValue))?$tmpValue:'').$tpl;
			}
		}
		else
		{
			$rValue['beginTime'] = TUNDEF;
			$rValue['endTime'] = TUNDEF;
			$rValue['kind'] = PLAYLIST;
			$rValue['link'] = '';
			$rValue['title'] = $tpl.'Musica Libera'.$tpl;
			$rValue['description'] = $tpl.'Rotazione musicale'.$tpl;

		}

		return $rValue;
	} /* end method getSchedule */

	public function getScheduleById($scheduleID)
	{
		$rValue = NULL;

		$query = '//settimana/giorno/ora/programma[@id = "'.$scheduleID.'"]';
		$resultsEl = $this->xpath->query($query);

		if ($resultsEl->length > 0)
		{
			$scheduleEl = $resultsEl->item(0);

			if (!is_null($scheduleEl))
			{
				$timeEl = $scheduleEl->parentNode;
				$dayEl = $timeEl->parentNode;

				if($this->usingTemplate)
				{
					$curDay = $dayEl->getAttribute('id');
					$scheduleDate =  date('dmY',strtotime($this->curWeekDays[$curDay]));
					$isoDate = date('Ymd',strtotime($this->curWeekDays[$curDay]));
				}
				else
				{
					$scheduleDate =  date('dmY',strtotime($dayEl->getAttribute('date')));
					$isoDate =  date('Ymd',strtotime($dayEl->getAttribute('date')));
				}

				if(!is_null($scheduleEl))
				{
					if($this->usingTemplate)
					{
						$scheduleId = $scheduleEl->getAttribute('id');
						$scheduleId = str_replace('ID_YYYY', $this->curYear, $scheduleId);
						$scheduleId = str_replace('WW', $this->curWeek, $scheduleId);
						$rValue['id'] = $scheduleId;
					}
					else
					{
						$rValue['id'] = $scheduleEl->getAttribute('id');
					}
					$rValue['isoDate'] = $isoDate;
					$rValue['date'] = $scheduleDate;
					$rValue['author'] = 'dharman';
					$rValue['typeTitle'] = 'schedule';
					$rValue['beginTime'] = $timeEl->getAttribute('begin');
					$rValue['endTime'] = $timeEl->getAttribute('end');
					if($rValue['endTime'] == T00_00) $rValue['endTime'] = T23_59;
					$rValue['kind'] = $scheduleEl->getAttribute('type');
					$rValue['title'] = $scheduleEl->childNodes->item(0)->nodeValue;
					$rValue['description'] = $scheduleEl->childNodes->item(1)->nodeValue;
					$rValue['link'] = $timeEl->getAttribute('url');
					$rValue['typeTitle'] = $rValue['kind'];
					$rValue['content'] = $rValue['description'];
				}
			}
		}

		return $rValue;
	} /* end method getScheduleById */

	public function getSchedules($sortOrder=ASC_ORDER, $dayName = NULL)
	{
		$rSchedules = NULL;
		$schedules = Array();

		$query = '//settimana/giorno';
		if($dayName != NULL) $query .= '[@id = "'.$dayName.'"]';
// echo "$query";
		$daysEl = $this->xpath->query($query);

		if (!is_null($daysEl))
		{
			foreach ($daysEl as $dayEl)
			{
				if($this->usingTemplate)
				{
					$curDay = $dayEl->getAttribute('id');
					$scheduleDate =  date('dmY',strtotime($this->curWeekDays[$curDay]));
					$isoDate = date('Ymd',strtotime($this->curWeekDays[$curDay]));
				}
				else
				{
					$scheduleDate =  date('dmY',strtotime($dayEl->getAttribute('date')));
					$isoDate =  date('Ymd',strtotime($dayEl->getAttribute('date')));
				}
				$nodes = $dayEl->childNodes;
				foreach ($nodes as $node)
				{
					$schedule = $node->childNodes->item(0);
					if($schedule != NULL)
					{
						if($this->usingTemplate)
						{
							$scheduleId = $schedule->getAttribute('id');
							$scheduleId = str_replace('ID_YYYY', $this->curYear, $scheduleId);
							$scheduleId = str_replace('WW', $this->curWeek, $scheduleId);
							$curSchedule['id'] = $scheduleId;
						}
						else
						{
							$curSchedule['id'] = $schedule->getAttribute('id');
						}
						$curSchedule['isoDate'] = $isoDate;
						$curSchedule['date'] = $scheduleDate;
						$curSchedule['author'] = 'dharman';
						$curSchedule['typeTitle'] = 'schedule';
						$curSchedule['beginTime'] = $node->getAttribute('begin');
						$curSchedule['endTime'] = $node->getAttribute('end');
						if($curSchedule['endTime'] == T00_00) $curSchedule['endTime'] = T23_59;
						$curSchedule['kind'] = $schedule->getAttribute('type');
						$curSchedule['title'] = $schedule->childNodes->item(0)->nodeValue;
						$curSchedule['description'] = $schedule->childNodes->item(1)->nodeValue;
						$curSchedule['link'] = $schedule->getAttribute('url');
						$curSchedule['typeTitle'] = $curSchedule['kind'];
						$curSchedule['content'] = $curSchedule['description'];
						$rSchedules[] = $curSchedule;
					}
				}
			}
		}

		usort($rSchedules, array($this,$sortOrder));

		return $rSchedules;
	} /* end method getSchedules */

	private function useDay($dayName)
	{
		$rResponse = false;

		if(in_array($dayName, $this->constants['user']))
		{
			$dayEl = $this->dayExists($dayName);
			if($dayEl == NULL)
			{
				$dayEl = $this->xmlDoc->createElement(self::DAY_ELEMENT);
				$dayEl->setAttribute('id', $dayName);
				$dayEl->setAttribute('date', $this->curWeekDays[$dayName]);
				$this->xmlRoot->appendChild($dayEl);
			}

			$rResponse = $this->dayExists($dayName);
		}

		return $rResponse;
	} /* end method useDay */

	private function useTime($dayName, $beginTimeValue, $endTimeValue)
	{
		$rResponse = false;

		if(in_array($dayName, $this->constants['user']))
		{
			$timeEl = $this->timeExists($dayName, $beginTimeValue, $endTimeValue);
			if($timeEl == NULL)
			{
// echo "POLLOA".$dayName.'-'.$beginTimeValue.'-'.$endTimeValue;
				$dayEl = $this->useDay($dayName);

				$timeEl = $this->xmlDoc->createElement(self::TIME_ELEMENT);
				$timeEl->setAttribute('begin', $beginTimeValue);
				$timeEl->setAttribute('end', $endTimeValue);
				$dayEl->appendChild($timeEl);
// 				$this->xmlRoot->appendChild($dayEl);
				$rResponse =  $this->timeExists($dayName, $beginTimeValue, $endTimeValue);
// echo "CAN:".$rResponse->nodeValue.'òòòò';
			}
			else
			{
// echo "POLLOB";
				$rResponse = $timeEl;
			}
		}

		return $rResponse;
	} /* end method useTime */

	public function scheduleExists($dayName, $beginTimeValue, $endTimeValue)
	{
		$rResponse = false;

		$timeEl =  $this->timeExists($dayName, $beginTimeValue, $endTimeValue);

		if($timeEl != NULL)
		{
			$schedule = $timeEl->getElementsByTagName(self::SCHEDULE_ELEMENT);

			if($schedule && count($schedule) >= 1)
				$rResponse = true;
		}

		return $rResponse;
	} /* end method scheduleExists */

	public function setSchedule($dayName, $beginTimeValue, $endTimeValue, $scheduleTitle, $scheduleDescription, $scheduleUrl, $scheduleType = PLAYLIST, $force = false)
	{
		$rResponse = -1;
		$timeSlotEl = $this->useTime($dayName, $beginTimeValue, $endTimeValue);
		if($timeSlotEl && !empty($scheduleTitle))
		{
			$scheduleEl = $this->xmlDoc->createElement(self::SCHEDULE_ELEMENT);
			$titleEl = $this->xmlDoc->createElement(self::TITLE_ELEMENT, $scheduleTitle);
			if(empty($scheduleDescription))
				$descriptionEl = $this->xmlDoc->createElement(self::DESCRIPTION_ELEMENT);
			else
				$descriptionEl = $this->xmlDoc->createElement(self::DESCRIPTION_ELEMENT, $scheduleDescription);

			$scheduleEl->setAttribute('url', $scheduleUrl);
			$scheduleEl->setAttribute('type', $scheduleType);
			$scheduleEl->appendChild($titleEl);
			$scheduleEl->appendChild($descriptionEl);

			if($this->scheduleExists($dayName, $beginTimeValue, $endTimeValue))
			{
				if(!$timeSlotEl->hasChildNodes())
				{
					$arrIds = Array();
					$query = '//settimana/giorno[@id = "'.$dayName.'"]/*/programma/@id';
					$entries = $this->xpath->query($query);
					foreach ($entries as $node) {
						$arrIds[] = str_replace($this->curYear.$this->curWeek,'',$node->nodeValue);
					}

					$newID = $this->curWeek.max($arrIds)+1;
					$scheduleEl->setAttribute('id', $this->curYear.$newID);
					$timeSlotEl->appendChild($scheduleEl);
					$rResponse = $this->curYear.$newID;
				}
				elseif($force)
				{
					$query = '//settimana/giorno[@id = "'.$dayName.'"]/ora[@begin <= "'.$beginTimeValue.'" and (@end >= "'.($endTimeValue).'" or @end = "00.00")]/programma/@id';
					$curId = $this->xpath->query($query)->item(0)->nodeValue;
// echo 'po-'.$curId->item(0)->nodeValue.'-llo';
					$scheduleEl->setAttribute('id', $curId);
					$timeSlotEl->replaceChild($scheduleEl, $timeSlotEl->childNodes->item(0));
					$rResponse = $curId;
				}
			}
//FIXME: Is this "ELSE" useful??
// 			else
// 			{
// 				$timeSlotEl->appendChild($scheduleEl);
// 				$rResponse = true;
// 			}
		}

		return $rResponse;
	} /* end method setSchedule */

	public function delSchedule($scheduleID)
	{
		$rValue = NULL;

		$query = '//settimana/giorno/ora/programma[@id = "'.$scheduleID.'"]';
		$resultsEl = $this->xpath->query($query);

		if ($resultsEl->length > 0)
		{

			$scheduleEl = $resultsEl->item(0);

			if (!is_null($scheduleEl))
			{
				$timeNode = $scheduleEl->parentNode;

				$rValue['id'] = $scheduleEl->getAttribute('id');

				$timestamp = strtotime($timeNode->parentNode->getAttribute('date'));
				$scheduleDate =  date('dmY',$timestamp);
				$isoDate =  date('Ymd',$timestamp);

				$rValue['isoDate'] = $isoDate;
				$rValue['date'] = $scheduleDate;
				$rValue['author'] = 'dharman';
				$rValue['typeTitle'] = 'schedule';
				$rValue['beginTime'] = $timeNode->getAttribute('begin');
				$rValue['endTime'] = $timeNode->getAttribute('end');
				if($rValue['endTime'] == T00_00) $rValue['endTime'] = T23_59;
				$rValue['kind'] = $scheduleEl->getAttribute('type');
				$rValue['title'] = $scheduleEl->childNodes->item(0)->nodeValue;
				$rValue['description'] = $scheduleEl->childNodes->item(1)->nodeValue;
				$rValue['link'] = $timeNode->getAttribute('url');
				$rValue['typeTitle'] = $rValue['kind'];
				$rValue['content'] = $rValue['description'];

				$timeNode->parentNode->removeChild($timeNode);
			}
		}

		return $rValue;
	} /* end method delSchedule */

	public function save()
	{
		if(!file_exists($this->rootPath)) mkdir($rootPath, 0777, true) or die('Failed to create palimpsest root folder');
// 		if($this->usingTemplate)
// 		if(basename($this->xmlFile) == $this->tplName)
// 		{
// 			if(!is_writable($this->xmlFile))				die('Unable to find a valid palimpsest file'/*.$this->xmlFile*/);
// 			$this->xmlFile
// 		}
			$this->xmlDoc->save($this->xmlFile) or die('Unable to write "'.$this->xmlFile.'"');
	} /* end method save */

} // CLASS palimpsestXML
