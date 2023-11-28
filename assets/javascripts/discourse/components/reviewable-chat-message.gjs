import { LinkTo } from "@ember/routing";
import Component from "@glimmer/component";
import ReviewableCreatedBy from "discourse/components/reviewable-created-by";
import ReviewablePostHeader from "discourse/components/reviewable-post-header";
import { cached } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { htmlSafe } from "@ember/template";
import { array } from "@ember/helper";
import or from "truth-helpers/helpers/or";
import I18n from "I18n";

export default class ReviewableChatMessage extends Component {
  @service store;
  @service chatChannelsManager;

  <template>
    <div class="flagged-post-header">
      {{!-- <LinkTo
        @route="chat.channel.near-message"
        @models={{array
          this.chatChannel.slugifiedTitle
          this.chatChannel.id
          @reviewable.target_id
        }}
      > --}}
      {{!-- <ChatChannelTitle @channel={{this.chatChannel}} /> --}}
      {{! </LinkTo> }}
    </div>

    <div class="post-contents-wrapper">
      <ReviewableCreatedBy
        @user={{@reviewable.target_created_by}}
        @tagName=""
      />
      <div class="post-contents">
        <ReviewablePostHeader
          @reviewable={{@reviewable}}
          @createdBy={{@reviewable.target_created_by}}
          @tagName=""
        />

        <div class="post-body">
          {{htmlSafe
            (or @reviewable.payload.message_cooked @reviewable.cooked)
          }}
        </div>

        {{#if @reviewable.payload.transcript_topic_id}}
          <div class="transcript">
            <LinkTo
              @route="topic"
              @models={{array "-" @reviewable.payload.transcript_topic_id}}
              class="btn btn-small"
            >
              {{this.transcriptViewLabel}}
            </LinkTo>
          </div>
        {{/if}}

        {{yield}}
      </div>
    </div>
  </template>

  transcriptViewLabel = I18n.t("review.transcript.view");
}
