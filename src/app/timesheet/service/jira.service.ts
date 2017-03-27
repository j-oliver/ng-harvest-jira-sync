import {Injectable} from '@angular/core';
import {Http, Response} from "@angular/http";

import {TimesheetEntry} from "../model/timesheet-entry";
import {JiraWorklog} from "../model/jira-worklog";
import {environment} from "../../../environments/environment";
import {Observable} from "rxjs";
import {JiraAccount} from "../model/jira-account";
import {JiraIssue} from "../model/jira-issue";
import {UtilsDate} from "../../utils/UtilsDate";
import {UtilsString} from "../../utils/UtilsString";

@Injectable()
export class JiraService {

  private urlsAreSet : boolean = false;

  private jiraRestBaseUrl : string;
  private jiraIssueUrl : string;
  private jiraMyselfUrl : string;
  private jiraSearchWorklog : string;
  private jiraWorklog : string;

  constructor(private http:Http) { }

  public loadMyJiraAccount() : Observable<JiraAccount> {
    this.ensureUrlsAreSet();

    return this.http.get(this.jiraMyselfUrl, { withCredentials: true })
      .map(response => response.json())
      .map(json => new JiraAccount(json));
  }

  public loadMyJiraWorklogs(date: Date) : Observable<JiraWorklog[][]> {
    this.ensureUrlsAreSet();

    return this.loadMyIssuesWithWorklog(date)
      .flatMap(issues => this.loadMyJiraWorklogsForIssues(date, issues))
  }

  public deleteWorklog(worklog : JiraWorklog) : Observable<Response> {
    this.ensureUrlsAreSet();

    let deleteWorklogUrl = this.jiraIssueUrl + worklog.issueId + this.jiraWorklog + worklog.id;

    return this.http.delete(deleteWorklogUrl, { withCredentials: true });
  }

  public copyHarvestToJira(timesheetEntry: TimesheetEntry) : Observable<JiraWorklog> {
    this.ensureUrlsAreSet();

    let postWorklogUrl = this.jiraIssueUrl + timesheetEntry.harvestEntry.getJiraTicket() + this.jiraWorklog;

    let jiraWorklog : JiraWorklog = new JiraWorklog();
    jiraWorklog.comment = timesheetEntry.harvestEntry.getCommentWithoutJiraTicket();
    jiraWorklog.started = timesheetEntry.harvestEntry.getISOStartDate();
    jiraWorklog.timeSpentSeconds = timesheetEntry.harvestEntry.getTimeInSeconds();

    return this.http.post(postWorklogUrl, jiraWorklog, { withCredentials: true })
      .map(response => response.json())
      .map(json => new JiraWorklog(json))
      .map(worklog => {
        worklog.issueKey = timesheetEntry.getJiraTicket();
        return worklog;
      });
  }

  private loadMyIssuesWithWorklog(date : Date) : Observable<JiraIssue[]> {
    let jiraSearchUrl = UtilsString.formatString(this.jiraSearchWorklog, [UtilsDate.getDateInFormatYYYYMMDD(date)])
    return this.http.get(jiraSearchUrl, { withCredentials: true })
      .map(response => response.json().issues);
  }

  private loadMyJiraWorklogsForIssues = (date: Date, myJiraIssues: JiraIssue[]) : Observable<JiraWorklog[][]> => {
    let loadWorklogsForIssueObservables = myJiraIssues
      .map(issue => this.loadWorklogsForIssue(issue));

    if(loadWorklogsForIssueObservables.length > 0){
      return Observable.forkJoin(loadWorklogsForIssueObservables);
    } else {
      return Observable.of([]);
    }
  };

  private loadWorklogsForIssue(issue : JiraIssue) : Observable<JiraWorklog[]> {
    let getWorklogUrl = this.jiraIssueUrl + issue.id + this.jiraWorklog;

    return this.http.get(getWorklogUrl, { withCredentials: true })
      .map(response => <JiraWorklog[]> response.json().worklogs)
      .map(worklogs => {worklogs.forEach(worklog => worklog.issueKey = issue.key); return worklogs; }
      )
  }

  private ensureUrlsAreSet(){
    if(!this.urlsAreSet){
      this.jiraRestBaseUrl = environment.jiraBaseUrl + "rest/api/2/";
      this.jiraIssueUrl = this.jiraRestBaseUrl + "issue/";
      this.jiraMyselfUrl = this.jiraRestBaseUrl + "myself";
      this.jiraSearchWorklog = this.jiraRestBaseUrl + "search?fields=summary&jql=worklogAuthor=currentUser() and worklogDate='{0}'";
      this.jiraWorklog = "/worklog/";

      this.urlsAreSet = true;
    }
  }
}
