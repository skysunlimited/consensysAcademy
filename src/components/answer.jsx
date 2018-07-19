import React from 'react';
import {Button } from 'react-bootstrap';

export default class Answer extends React.Component {
    constructor(props, context) {
      super(props, context);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit() {
      this.acceptOnChain();
    }

    async acceptOnChain() {
      console.log('Accepting onchain...')
      await this.props.contract.acceptAnswer.sendTransaction(this.props.answerInfo.itemNo, this.props.answerInfo.answerNo, {from: this.props.account});
      console.log('Accepting onchain done!')
    }

    render() {

      let status;
      if(this.props.itemOwner === this.props.account){
        status = <div>
                  {this.props.answerInfo.date} {this.props.answerInfo.answer}
                  <Button bsStyle="primary"  onClick={this.handleSubmit}>Accept Answer</Button>
                  <hr></hr>
                </div>
      }else{
        status = <div>
                  {this.props.answerInfo.date} {this.props.answerInfo.answer}
                  <hr></hr>
                </div>
      }

      return(
        <div>
        {status}
        </div>
      );
    }
}