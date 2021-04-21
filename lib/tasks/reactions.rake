# frozen_string_literal: true

def words_list
  @words_list ||= ['etsy', 'twee', 'hoodie', 'Banksy', 'retro', 'synth', 'single-origin', 'coffee', 'art', 'party', 'cliche', 'artisan', 'Williamsburg', 'squid', 'helvetica', 'keytar', 'American Apparel', 'craft beer', 'food truck', "you probably haven't heard of them", 'cardigan', 'aesthetic', 'raw denim', 'sartorial', 'gentrify', 'lomo', 'Vice', 'Pitchfork', 'Austin', 'sustainable', 'salvia', 'organic', 'thundercats', 'PBR', 'iPhone', 'lo-fi', 'skateboard', 'jean shorts', 'next level', 'beard', 'tattooed', 'trust fund', 'Four Loko', 'master cleanse', 'ethical', 'high life', 'wolf moon', 'fanny pack', 'Terry Richardson', '8-bit', 'Carles', 'Shoreditch', 'seitan', 'freegan', 'keffiyeh', 'biodiesel', 'quinoa', 'farm-to-table', 'fixie', 'viral', 'chambray', 'scenester', 'leggings', 'readymade', 'Brooklyn', 'Wayfarers', 'Marfa', 'put a bird on it', 'dreamcatcher', 'photo booth', 'tofu', 'mlkshk', 'vegan', 'vinyl', 'DIY', 'banh mi', 'bicycle rights', 'before they sold out', 'gluten-free', 'yr butcher blog', 'whatever', 'Cosby Sweater', 'VHS', 'messenger bag', 'cred', 'locavore', 'mustache', 'tumblr', 'Portland', 'mixtape', 'fap', 'letterpress', "McSweeney's", 'stumptown', 'brunch', 'Wes Anderson', 'irony', 'echo park']
end

def generate_email
  email = words_list.sample.delete(' ') + '@' + words_list.sample.delete(' ') + '.com'
  email.delete("'").force_encoding('UTF-8')
end

def create_user(user_email)
  user = User.find_by_email(user_email)
  unless user
    puts "Creating new account: #{user_email}"
    user = User.create!(email: user_email, password: SecureRandom.hex, username: UserNameSuggester.suggest(user_email))
  end
  user.active = true
  user.save!
  user
end

desc "create users and generate random reactions on a post"
task "reactions:generate", [:post_id, :reactions_count, :reaction] => [:environment] do |_, args|
  if !Rails.env.development?
    raise "rake reactions:generate should only be run in RAILS_ENV=development, as you are creating fake reactions to posts"
  end

  post_id = args[:post_id]

  if !post_id
    return
  end

  post = Post.find_by(id: post_id)

  if !post
    return
  end

  reactions_count = args[:reactions_count] ? args[:reactions_count].to_i : 10

  reactions_count.times do
    reaction = args[:reaction] || DiscourseReactions::Reaction.valid_reactions.to_a.sample
    user = create_user(generate_email)

    puts "Reaction to post #{post.id} with reaction: #{reaction}"
    DiscourseReactions::ReactionManager
      .new(reaction_value: reaction, user: user, guardian: Guardian.new(user), post: post)
      .toggle!
  end
end

desc "Converts reactions to like"
task "reactions:nuke", [:reaction_list_to_convert] => [:environment] do |_, args|
  require 'highline/import'
  destroy = ask("You are about to destroy all reactions from database and convert some/all of them to likes, are you sure ? y/n  ")

  if destroy.downcase != "y"
    raise "You are not sure about the task, aborting the task"
  end

  puts "Disabling the discourse_reactions plugin"
  SiteSetting.discourse_reactions_enabled = false
  POST_UNDO_ACTION_WINDOW_MINS = SiteSetting.post_undo_action_window_mins
  SiteSetting.post_undo_action_window_mins = 2000000000
  reactions = []

  if args[:reaction_list_to_convert]
    reaction_list_to_convert = args[:reaction_list_to_convert].split('|')
    reactions = DiscourseReactions::Reaction.where("reaction_value IN (?)", reaction_list_to_convert)
  else
    reactions = DiscourseReactions::Reaction.all
  end

  raise "invalid input list OR there are no reactions made" if reactions.length == 0

  reactions.each do |reaction|
    puts "Converting '#{reaction.reaction_value}' of post_id: #{reaction.post_id} to like..."

    if reaction.reaction_users.count == 0
      puts "No reaction users found for #{reaction.reaction_value} reaction..."

      next
    end

    reaction.reaction_users.each do |reaction_user|
      post = Post.find_by(id: reaction_user.post_id)
      user = User.find_by(id: reaction_user.user_id)

      puts "Couldn’t find user with id: #{reaction_user.user_id}, continuing to next reaction..." if !user
      puts "Couldn’t find post with id: #{reaction_user.post_id}, continuing to next reaction..." if !post

      next unless post && user

      result = DiscourseReactions::ReactionManager
        .new(reaction_value: DiscourseReactions::Reaction.main_reaction_id, user: user, guardian: Guardian.new(user), post: post)
        .toggle!

      raise "Unexpected error in converting reaction to like..." unless result && result.success
    end
  end

  SiteSetting.post_undo_action_window_mins = POST_UNDO_ACTION_WINDOW_MINS

  badge = Badge.find_by(name: I18n.t("badges.first_reaction.name"))

  if badge
    puts "Revoking '#{I18n.t("badges.first_reaction.name")}' badge from all users..."
    BadgeGranter.revoke_all(badge)
  end

  puts "Deleting all remaining reactions and reaction_users..."
  DiscourseReactions::Reaction.all.delete_all
  DiscourseReactions::ReactionUser.all.delete_all

  puts "Hurray! you have successfully converted reactions to like."
end
