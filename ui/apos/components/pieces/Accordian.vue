<template>
  <div class="faq-container">
    <div class="faq-question" ref="accordian">
      <div class="faq-description" v-on:click="toggle"><span>{{title}}</span><span>+</span></div>
      <div class="faq-content" style="display: none;">
        <slot name="content"></slot>
      </div>
    </div>
  </div>
</template>

<script>
// This component is modified from the npm package vue-accordian-menu
// Author WesleyZen, @WeiChiaChang
// Obtained 07/21/22 from https://github.com/WeiChiaChang/vue-accordion-menu/blob/master/src/components/accordionMenu.vue
export default {
  name: 'Accordian',
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  methods: {
    toggle: function () {
      // console.log(this)
      // console.log(this.$el)
      // console.log(this.$el.children)
      // 設定參數作為指定 children 的區別
      let accordian = this.$refs['accordian']
      if (accordian.classList.contains('open')) {
        // console.log("if")
        accordian.classList.remove('open')
        accordian.querySelectorAll('.faq-content')[0].style.display = 'none'
      } else {
        // console.log("else")
        // var prevFaqQuestion = this.$el.querySelectorAll('.open')
        // if (prevFaqQuestion.length !== 0) {
        //   prevFaqQuestion[0].classList.remove('open')
        //   prevFaqQuestion[0].querySelectorAll('.faq-content')[0].style.display = 'none'
        // }
        accordian.classList.add('open')
        accordian.querySelectorAll('.faq-content')[0].style.display = ''
      }
    },
  },
}
</script>

<style scoped>
.faq-container {
  width: 100%;
  margin: 0 auto;
}
.faq-question {
  padding: 0px;
  transition: all 0.3s;
}
.faq-content {
  padding: 0 1em 1em 1em;
}
.faq-description {
  display: flex;
  cursor: pointer;
  flex-flow: row nowrap;
  font-size: 1.25em;
  justify-content: space-between;
  align-items: center;
  color: #4a4a4a;
  padding: 1em;
  border-top: 1px solid #d1d3d4;
  position: relative;
  -webkit-transition: all 0.3s;
  -moz-transition: all 0.3s;
  transition: all 0.3s;
}
.faq-description span:last-child {
  cursor: pointer;
  -webkit-transition: transform 0.3s;
  -moz-transition: transform 0.3s;
  transition: transform 0.3s;
  height: 55px;
  color: #979797;
  font-size: 1.6em;
}
.faq-description .faq-number {
  width: 30px;
  height: 30px;
  line-height: 28px;
  border: 1px solid black;
  padding-right: 1px;
  display: inline-block;
  text-align: center;
  border-radius: 100px;
  -webkit-border-radius: 100px;
  margin-right: 10px;
  font-size: 20px;
  color: #4a4a4a;
  letter-spacing: -0.86px;
  position: absolute;
  z-index: 1;
  top: 20px;
  left: 5px;
  -webkit-transition: all 0.3s;
  -moz-transition: all 0.3s;
  transition: all 0.3s;
  font-weight: normal;
}
.faq-question.open {
  background: #f7f7f7;
}
.faq-question.open .faq-description {
  font-weight: 400;
}
.faq-question.open .faq-description .faq-number {
  color: white;
  background: #4a4a4a;
}
.faq-question.open .faq-description span:last-child {
  -moz-transform: rotate(-405deg);
  -ms-transform: rotate(-405deg);
  -webkit-transform: rotate(-405deg);
  -o-transform: rotate(-405deg);
  transform: rotate(-405deg);
  font-weight: normal;
}
@media (max-width: 767px) {
  .faq-container {
    width: 100%;
    border-radius: 0;
    border: 1px solid transparent;
    border-bottom: 1px solid #D9D9D9;
    padding: 0;
  }
  .faq-description {
    font-size: 1.25em;
  }
}
</style>