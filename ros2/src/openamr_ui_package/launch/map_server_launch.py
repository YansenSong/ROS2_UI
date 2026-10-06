# Import des modules nécessaires pour créer un fichier de lancement
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

# Deprecated compatibility launch for the legacy UI map server.
#
# Do not use this alongside the platform Nav2 launch. It is intentionally
# namespaced so an accidental launch cannot create a second /map_server and
# confuse Nav2's AMCL lifecycle.

def generate_launch_description():
    map_file = LaunchConfiguration('map_yaml')

    map_server=Node(
            package='nav2_map_server',  # Package name
            executable='map_server',    # Node executable name
            name='map_server',          # Node name
            namespace='ui_legacy',
            parameters=[{'yaml_filename': map_file}],
        )
    
    lifecycle_nodes = ['map_server']
    use_sim_time = True
    autostart = True

    start_lifecycle_manager_cmd = Node(
            package='nav2_lifecycle_manager',
            executable='lifecycle_manager',
            name='lifecycle_manager',
            namespace='ui_legacy',
            output='screen',
            emulate_tty=True,  # https://github.com/ros2/launch/issues/188
            parameters=[{'use_sim_time': use_sim_time},
                        {'autostart': autostart},
                        {'node_names': lifecycle_nodes}])

    
    return LaunchDescription([
        DeclareLaunchArgument('map_yaml', description='Absolute path to a saved map YAML file'),
        map_server, start_lifecycle_manager_cmd
    ])
