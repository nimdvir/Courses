---
created: 2024-08-22T00:48:47 (UTC -04:00)
tags: []
source: https://openeducationanalytics.org/get-started/
author: 
---

# Get Started | Open Education Analytics

> ## Excerpt
> Open Education Analytics is an open community developing modern data intelligence capabilities for global education.

---
*   ## The Use Case Process
    
*   ![OEA use case process diagram][fig1]

![][fig2]

*   [Get Started Quickly](https://openeducationanalytics.org/get-started/#list-item-0)
*   [Define the Problem](https://openeducationanalytics.org/get-started/#list-item-1)
*   [Setup the Modern Data Estate](https://openeducationanalytics.org/get-started/#list-item-2)
*   [Explore and Model Data](https://openeducationanalytics.org/get-started/#list-item-3)
*   [Communicate and Act](https://openeducationanalytics.org/get-started/#list-item-4)

#### Get Started Quickly

Open Education Analytics is a process to get started on the data modernization and AI journey, developed by education systems in collaboration with Microsoft Education. The OEA Use Case Template provides a guide for designing and documenting decisions to ensure data and AI are used ethically and responsibly. OEA technical resources make getting started on data modernization much faster, with a framework that can be quickly deployed. Finally, open source modules and packages in OEA make it easier to explore common education datasets and to build models for education scenarios.

![The OEA Framework][fig3]

The OEA Framework

##### 1

###### Define the Problem

**Define the Use Case Problem to solve through documenting decisions in the OEA Use Case Template: [Download OEA Use Case Template](https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fraw.githubusercontent.com%2Fmicrosoft%2FOpenEduAnalytics%2Fmain%2Fdocs%2Fuse_cases%2FOpen_Education_Analytics_Use_Case_Template_v3.docx&wdOrigin=BROWSELINK)**

OEA recommends starting data projects by defining the problem to be solved for learners and learning up front.

Collaborating with key stakeholders in defining the problem (such as learners, educators, school leaders and the data team) can prevent many problems such as:

*   Asking the wrong questions
    
*   Using the wrong type of data or too much data for the use case
    
*   Making incorrect assumptions
    
*   Alienating the people who will use the data solution
    

##### 2

###### Set Up Modern Data Estate

Using the [OEA Setup on GitHub](https://github.com/OpenEducationAnalytics/OpenEduAnalytics), education data teams can set up the modern data estate in minutes.

To setup the fully functional OEA reference architecture, follow the 3-step setup process on the OEA GitHub repository. The OEA reference architecture has been developed by Microsoft data architects using the most powerful data services from Azure and open source tools. It sets up the foundation to enable many different use cases to be developed by an education system.

**Setup**

You can setup this fully functional reference architecture (which includes test data sets for basic examples of usage) in 3 steps:

1.  Open cloud shell in your Azure subscription (use ctrl+click on the button below to open in a new page)
    
2.  Download the OEA framework setup script and framework assets to your Azure clouddrive
    
    ```
    https://github.com/OpenEducationAnalytics/OpenEduAnalytics/releases/download/OEA_framework_v0.6.1/OEA_v0.6.1.zip
    ```
    
3.  Run the setup script like this (substitute “mysuffix” with your preferred suffix, which must be less than 13 characters and can only contain letters and numbers - this will be used as a suffix in the naming of provisioned resources):
    
    ```
    ./OEA_framework_v0.6.1/setup.sh mysuffix
    ```
    

Visit the [OEA GitHub repository](https://github.com/OpenEducationAnalytics/OpenEduAnalytics) for additional setup steps and guidance.

##### 3

###### Explore and Model Data

**Build off the work of the Open Education Analytics Community**

OEA GitHub includes open source data [modules](https://github.com/OpenEducationAnalytics/OpenEduAnalytics/tree/main/modules) for common education datasets. You can connect many of your datasets quickly, combine them with other data, and move to data visualisation and insights quickly.

Use OEA [packages](https://github.com/OpenEducationAnalytics/OpenEduAnalytics/tree/main/packages) to develop models that solve common education challenges like predicting at risk or vulnerable students.

OEA is developed as a community so that education systems and OEA partners can contribute back to OEA as they develop modules and packages for use cases that may be relevant to other education systems. Learn how to contribute [here.](https://github.com/OpenEducationAnalytics/OpenEduAnalytics/blob/main/docs/license/CONTRIBUTING.md)

##### 4

###### Communicate and Act

Communicate analytics using Power BI data visualizations and reports; set up automated actions based on analytics using low code Power Apps, or trigger data-driven actions using Dynamics 365, Office 365, or Microsoft Teams.

![][fig4]

*   ### Stay in touch with OEA!
    
*   We send out monthly newsletters to share updates from the OEA team and community, best practices on data and Responsible AI, upcoming framework and technical asset releases, and skills and training resources.
    
*   [](https://forms.office.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR5NDr5sf_dtDjnfk_xBUTm5UMUVVMEVIVU5JTVpaTktSQTMwMzZaWDZRNi4u)

![][fig5]

[fig1]: https://openeducationanalytics.org/assets/imgs/img_use_case_process.svg
[fig2]: https://openeducationanalytics.org/assets/imgs/img_blue_backdrop_bottom.svg
[fig3]: https://openeducationanalytics.org/assets/imgs/OEA_framework_top_level.png
[fig4]: https://openeducationanalytics.org/assets/imgs/img_blue_backdrop_top.svg
[fig5]: https://openeducationanalytics.org/assets/imgs/img_blue_swivel_backdrop_bottom.svg
