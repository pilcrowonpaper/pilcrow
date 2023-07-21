---
title: 'A look into "GDPR compliant" analytics'
description: "What makes something GDPR compliant, and how do you implement analytics without violating it?"
date: "2023-05-09"
tldr: "Unique identifiers are considered personal data, and you are still required to have a privacy policy even when using privacy-friendly analytics tool."
---

For the past few days, I've been looking into various analytics services. I just need something simple and lightweight for my blog and library docs that doesn't require those annoying banners. Daily views, countries, OS/device - that's pretty much all I need. I was interested in implementing it myself so I wanted to know how I can make it GDPR compliant. No worries, let me just ask Google... and that led me down a rabbit hole of EU law.

Here's a short summary of what I found after reading tons of legal documents. It should be obvious but **I'm not a lawyer, and this is not legal advice.** I don't have the legal expertise or experience to make any decisive conclusions, but I've tried my best to get an accurate view on it.

I also looked through how popular analytics provider were handling it, specifically looking into how they counted visitors. My conclusion is that a lot of them are in a legal grey area, and I personally think that there are situations where it may be violating EU privacy laws. This was especially the case for those that claim that they were GDPR complaint and don't use cookies.

## Related laws

### GDPR

[Full text](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679). The General Data Protection Regulation (GDPR - Regulation 2016/679), is an EU law on data protection and privacy enacted in 2016, effective since 2018. It protects consumers from unwanted data collection from services, and gives them control over how it's handled.

This regulation does not directly mention or prohibit cookies, and is only intended to protect user privacy.

### The ePrivacy Directive

[Full text](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32002L0058). Directive 2002/58/EC, more commonly known as the ePrivacy Directive, regulates how data traffic is handled and aims to protect user privacy. It also includes provision to limit spam and tracking, including the use of cookies.

While "directives" are not laws and rather more of a goal for each member state to reach by enacting laws individually, every member state has adopted this directive.

### Scope

Both of these apply to all 27 member states of the EU, as well as counties in the European Economic Area (Norway, Liechtenstein, Iceland). You must comply if you are either an entity operating in the Union, or providing a service to its population. Since GDPR is an EU law, it applies to non-citizens living its territory, but not to citizens living abroad.

The UK has its own version of GDPR, and the ePrivacy Directive is called the Privacy and Electronic Communications Regulations (PECR). They're nearly identical to their European counterparts.

If a user from Europe visits your site, you must comply.

## Personal data

'Personal data' in the context of GDPR is defined in Article 4(1):

> (...) any information relating to an identified or identifiable natural person (‘data subject’); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person;

'Natural person' is likely for clarifying that it doesn't apply to companies or dead people. Any data we consider "personal data" is included, like names and home addresses. But it also includes data that "indirectly" identifies a person. Recital 30:

> Natural persons may be associated with online identifiers (...) such as internet protocol addresses, cookie identifiers (...)

From this, I think we can assume means any data that is linked to a single user, including via their device, is considered personal data. IP addresses, session ids, user ids, and usernames fit that description. It does not matter whether you can extract meaningful personal info or not. If you can (re)identify the user, it's considered personal data.

Unique identifiers, regardless of the method used to generate it (including fingerprinting), are personal data. Encrypting or hashing the data, a process referred to as 'pseudonymization,' may affect the fines when there's a data breach, but the resulting output is still considered personal data.

The user should be informed what personal data are processed and for what purpose.

#### IP address

Sending requests to third party APIs may be a violation of GDPR as the user's IP address was unknowingly shared with a third party, especially if you had the option to self-host or proxy the request. This includes using Google Fonts and embedding social media posts.

- EUCJ: [Fashon ID case](https://curia.europa.eu/juris/document/document.jsf?text=&docid=216555&pageIndex=0&doclang=EN&mode=lst&dir=&occ=first&part=1&cid=6340488)
- German regional court: [Google Fonts case](https://rewis.io/urteile/urteil/lhm-20-01-2022-3-o-1749320/)

### Handling personal data

**Personal data may not be processed, including its storage and transmission, without a legal basis** (Article 6). These legal bases are not applicable to cookies.

1. Consent: The user has given clear consent for a specific purpose with an affirmative action.
2. Contractual obligation: 'Contract' in this case may include terms of service.
3. Legal obligation
4. Vital interests: Saving one's life.
5. Public task
6. Legitimate interests

You must disclose (in a privacy policy or equivalent) what data you're collecting and what purposes (including the legal basis to do so) as mentioned in Article 13 (1):

> Where personal data relating to a data subject are collected from the data subject, the controller shall, at the time when personal data are obtained, provide the data subject with all of the following information: (...) (c) the purposes of the processing for which the personal data are intended as well as the legal basis for the processing; (d) where the processing is based on point (f) of Article 6(1), the legitimate interests pursued by the controller or by a third party; (e) the recipients or categories of recipients of the personal data, if any;(...)

If you're using a third party tool, it should be mentioned as well.

#### Consent

Consent must be opt-in. A pre-ticked checkbox or any other default consent are not allowed. The choice must be presented in a way clearly distinguishable from other matters, and must be written in a clear and concise language. Finally, the user must be given a choice to withdraw.

#### Legitimate interests

While (6) is purposefully broad and is the most flexible out of the six, there must be a specific interest, be it commercial or security, for it to apply. Users' personal rights override your own interests as well, and it cannot be used if you have more unintrusive way to achieve your "interests". You must disclose the legitimate interests you are pursuing (in a privacy policy for example). **Security related interests, such as DDOS protection, are explicitly stated to be considered proper legitimate interests** in recital 49:

> This [a legitimate interest of the data controller concerned] could, for example, include preventing unauthorised access to electronic communications networks and malicious code distribution and stopping ‘denial of service’ attacks and damage to computer and electronic communication systems.

Your users have a right to object to their personal data being processed, as stated in Article 21(1):

> The data subject shall have the right to object, on grounds relating to his or her particular situation, at any time to processing of personal data concerning him or her which is based on point (e) or (f) [legitimate interests] of Article 6(1), (...)

While you don't need to comply if you have "compelling legitimate grounds" that override your users' objection, it is generally recommended that there an option to opt-out of the processing is present.

### Anonymous data

Anonymous data, data that cannot be used to identify the user directly or indirectly, are not considered personal data and can be processed without the user's consent (recital 26):

> The principles of data protection should therefore not apply to anonymous information, namely information which does not relate to an identified or identifiable natural person or to personal data rendered anonymous in such a manner that the data subject is not or no longer identifiable.

This may include initials, gender, country, and device. Masked IP addresses are [considered anonymous under French regulators](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications), though a clear EU wide decision has not been made.

| type | requirement        | before                                    | masked                     |
| ---- | ------------------ | ----------------------------------------- | -------------------------- |
| IPv4 | Remove last octet  | `128.128.128.128`                         | `128.128.128.0`            |
| IPv6 | Remove last 80 bit | `0123:4567:89ab:cdef:0123:4567:89ab:cdef` | `0123:4567:89ab:0:0:0:0:0` |

However, the combination of such anonymous data may be considered personal data, such as a masked IP address and device type.

### Statistical purpose

Processing personal data for statistical purposes fall within the initial purpose/legal basis of processing, and you may do so without an additional legal basis (Article 5(1)):

> (...) further processing for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes shall, in accordance with Article 89(1), not be considered to be incompatible with the initial purposes (‘purpose limitation’);

However, processing data for the sole reason of producing statistics is not a legitimate legal basis of collecting personal data.

## The ePrivacy Directive

While the directive is relevant to many aspects of privacy, the one we're interested in is Article 5(3):

> (...) the use of electronic communications networks to store information or to gain access to information stored in the terminal equipment of a subscriber or user is only allowed on condition that the subscriber or user concerned is provided with clear and comprehensive information (...), and is offered the right to refuse such processing by the data controller.

In other words, **you are not allowed to store any data onto the user's device (cookies, local storage, cache) without their consent**, unless it is strictly required to provide the content/service the user has requested. Said exception is stated in the next part:

> This shall not prevent any technical storage or access for the sole purpose of carrying out or facilitating the transmission of a communication over an electronic communications network, or as strictly necessary in order to provide an information society service explicitly requested by the subscriber or user.

GDPR's 6 legal bases for processing personal data (including legitimate interests), do not apply in regards to cookies. Auth cookies (session id or JWT) can be considered "strictly required."

### Personal data

Does the Article mentioned above (Article 5) applies to cookies that don't store personal data? Article 3 states on "Services concerned":

> This directive shall apply to the processing of personal data in connection with the provision of publicly available electronic communications services in public communications networks in the Community.

This seems as if the directive only applies to processing personal data. However, recital 24 states:

> Terminal equipment of users of electronic communications networks and any information stored on such equipment are part of the private sphere of the users requiring protection under the European Convention for the Protection of Human Rights and Fundamental Freedoms.

Using the device (= storing data) without the user's consent violates their private sphere and, as such, their fundamental freedom. So to answer the question, yes, it applies to non-personal data. The highest court in Germany agrees in the [case of Planet49](https://curia.europa.eu/juris/document/document.jsf?text=&docid=218462&pageIndex=0&doclang=EN&mode=lst&dir=&occ=first&part=1&cid=5731980), where it attempted to answer the same question (referred to as "Question 1(b)"):

> (...) the answer to Question 1(b) is that Article 2(f) and Article 5(3) of Directive 2002/58, read in conjunction with Article 2(h) of Directive 95/46 and Article 4(11) and Article 6(1)(a) of Regulation 2016/679, are not to be interpreted differently according to whether or not the information stored or accessed on a website user’s terminal equipment is personal data within the meaning of Directive 95/46 and Regulation 2016/679.

## Analytics

The issue with counting unique visitors is that you have to distinguish new users from returning users. There's only 2 ways to do that:

1. Assign every user an id and store it on initial request.
2. Store some flag to users who visit your site.

The first option, in my opinion, violates GDPR as it requires you to process personal data (a unique identifier), and the second option violates the ePrivacy Directive as you're storing data onto the user's device if you don't show a cookie banner.

| service   | possible violation                          | relevant legislation |
| --------- | ------------------------------------------- | -------------------- |
| Fathom    | assigns unique id: hash from ip, user agent | GDPR                 |
| Plausible | assigns unique id: hash from ip, user agent | GDPR                 |
| PostHog   | assigns unique id + storage before consent  | GDPR, ePrivacy       |
| Umami     | assigns unique id: hash from ip, user agent | GDPR                 |
| Vercel    | assigns unique id: hash from ip, user agent | GDPR                 |

### Legitimate interests

As mentioned earlier, there is a legal basis for processing personal data that analytics may apply: legitimate interests. Some analytics provider disclose this but some don't. However, there are few things you have to consider.

First, your interests must be specific. "I was just curious" would likely not work. A/B testing for comparing the performance of 2 versions of a page may be valid.

Second, it must be done in the most un-intrusive way possible. For example, if you want to gauge user interests, views should be sufficient instead of unique visitors. Measuring bounce rates and session length do require storing sessions, but there may be ways to measure similar data without the use of identifiers. It's also important that people will reasonably expect you to do so. I don't think many people expect websites to measure how long they're on the page!

Finally, you must disclose what you're collecting and for what reason. If you're using a third party analytics, your users should known about it as well.

There are 2 issues that arise from this:

1. Every site has different needs: You may not have a particular reason for collecting all the metrics collected by your analytics provider, in which case legitimate interests may not apply.
2. A privacy policy is still required: You still need to disclose the what personal data you're processing, why, and how, as well as who you're sharing the data with.

**Just because you're using a GDPR compliant tool, it does not make your site GDPR compliant.**

### Cookie exception

Matomo claims its no-consent cookie based configuration is approved by CNIL, France's data privacy regulatory body. While this is true, as [CNIL considers some analytics cookies exempt from requiring consent](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications) under certain conditions, this is only applicable to France.

## Now what?

So, what options are left? Well, not a lot to be honest. For me, I intend to only "track" users from non-EU users and guesstimate total unique visitors by comparing it with total views. You can use "legitimate interests" if you want, but is it really worth thinking about and writing legal stuff?

There is hope though. The European Commission is [considering replacing the old ePrivacy Directive](https://digital-strategy.ec.europa.eu/en/policies/eprivacy-regulation), the directive prohibiting all non-essential cookies. Among the many planned changes, it'll allow some cookies for analytics purposes. Unfortunately, it might a take while...

## Other things to consider

Here are some important things from GDPR that isn't related to analytics.

### Responsibility

The responsibility to ensure the user's personal data is protected is placed on the controller, not the processor. The controller is the one who controls what data is processed by itself and processors, who process the data on behalf of the controller. If you're using Google Analytics, for example, you are the controller while Google is the processor.

### Data transfer

Personal data must not be transferred to third countries unless certain conditions are met. Data can be transferred to countries that the EU has deemed to have adequate level of protection, including the United Kingdom and Canada (Article 45). Notably, the United States is not included. Alternatively, individual corporation are required to implement Standard Contractual Clauses (SCC) and/or an adequate safe guard as an alternative (Article 47). Those should be already covered if you host on Cloudflare and Vercel.

You may be allowed in the absence of the requirement above if they meet certain conditions, including consent, contractual obligation, and legitimate interest (Article 49).

Users should be informed of any international data transfer.
