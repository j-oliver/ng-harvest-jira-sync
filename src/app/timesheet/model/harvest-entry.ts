
import {JsonSerializable} from "./json-serializable";
import {UtilsString} from "../../utils/UtilsString";

export class HarvestEntry extends JsonSerializable{
  id: number;
  user_id: number;
  spent_at: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  task_id: number;
  project: string;
  task: string;
  client: string;
  notes: string;
  hours_without_timer: number;
  hours: number;
  timer_started_at: string;

  //https://regex101.com/r/cqsnSc/1
  readonly jiraTicketRegexp = /^[A-Z]+-[0-9]+(?=\s|:|$)/i;

  //https://regex101.com/r/vKeuu1/2
  readonly jiraTicketPrefixToRemoveRegexp = /^[A-Z]+-[0-9]+(?:\s+|:\s*|\s*$)/i;

  public hasJiraTicket = () : boolean => {
    return this.jiraTicketRegexp.test(this.notes);
  };

  public getJiraTicket = () : string => {
    if(this.hasJiraTicket){
      return this.jiraTicketRegexp.exec(this.notes)[0].toUpperCase();
    }
    return "";
  };

  public getCommentWithoutJiraTicket = () : string => {
    if(!this.hasJiraTicket()){
      return this.getDecodedNotes();
    } else {
      return this.getDecodedNotes().replace(this.jiraTicketPrefixToRemoveRegexp,"")
    }
  };

  public getDecodedNotes = () : string => {
    return UtilsString.decodeHtmlEntities(this.notes);
  };

  public getTimeInSeconds = () : number => {
    return this.getTimeInMinutes() * 60;
  };

  //In Harvest time is always represented as hours with 2 decimal digits
  //To get the correct number of minutes we multiply by 60 and round it to full minutes
  //For example 2 minutes in Harvest will be represented as 0,03h
  //0.03 * 60 = 1.8 => rounding 1.8 up to 2 minutes
  //Otherwise the subsequent seconds will not be "full" minutes and resulting Jira minutes will not exactly match!
  private getTimeInMinutes = () : number => {
    return Math.round(this.hours * 60);
  };

  //returns ex. "2017-02-19T09:00:00.000+0100"
  public getISOStartDate() : string {
    //input is only date as "2017-02-19"
    let isoDateSpentAt = new Date(this.spent_at);

    // = 9am with timezone +0100
    isoDateSpentAt.setHours(10);

    //Jira cannot handle Z syntax -> replace it with +0100 timezone
    return isoDateSpentAt.toISOString().replace("Z", "+0100");
  };
}
