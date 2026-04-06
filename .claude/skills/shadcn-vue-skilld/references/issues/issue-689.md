---
number: 689
title: "[Feature]: Time picker component"
type: other
state: closed
created: 2024-07-30
url: "https://github.com/unovue/shadcn-vue/issues/689"
reactions: 51
comments: 3
---

# [Feature]: Time picker component

### Describe the feature

Hello everyone,

I wanted to implement a time picker and there was no component for it, the recently added number field wasn't what I was looking for so I did a little search and found

https://time.openstatus.dev/

It's an open source implementation using shadcn/ui for react with a simple `<Input/>` component so I modify it for shadcn/vue.

I succeeded and here I'm sharing the component to see if it helps someone or maybe if it gets integrated with the library itself, specially at the calendar component.

---

To make it work we need to follow the same steps from the openstatus component, that is:

1. Install **shadcn** including the `Input` component (twelve-hour clocks also need the `Select` component)

2. Copy & paste `time-picker-utils.tsx` (inside `@/components/ui/time-picker`)

This step stays the same but you need to change the extension to `.ts` instead of `.tsx` (its just a typescript file) 

3. Copy & paste `time-picker-input.tsx`

Alright so here's my edited component that I saved as `time-picker-input.vue`

...

---

## Top Comments

**@weristwiegott** (+7):

Thanks for your code.

I successfully integrated Calendar.vue from ShacdnVue with TimePicker. Check out the code here: 🏼

 Calendar + TimePicker Integration

**@olemarius** (+1):

@weristwiegott gist deleted? 

**@sitefinitysteve**:

@olemarius 404 here as well, looking for a Timepicker too